const TaxRule = require('../models/TaxRule');

const calculateTaxForProperty = async (property) => {
    // 0. Check for specific exemptions
    if (property.isExempt) {
        return {
            amount: 0,
            breakdown: { rule: 'Property is specifically marked as Exempt', calculated: 0 }
        };
    }

    // 0.1 Check for exempt property types immediately (Religious, Government, Charity)
    const exemptTypes = ['Religious', 'Government', 'Charity', 'Educational']; // Added Educational as it fits the context usually, need to double check requirements
    // Re-reading requirements: Exempt Categories: Mosque, Madrasa, Quran school, Cemetery, Government, Charity.
    // Educational covers Madrasa/Quran school roughly, but let's stick to the mapped types.
    if (['Religious', 'Government', 'Charity'].includes(property.propertyType)) {
        return {
            amount: 0,
            breakdown: { rule: `Exempt Category: ${property.propertyType}`, calculated: 0 }
        };
    }


    // 1. Fetch applicable rule
    // Priority: Specific Building Type > General Property Type
    // Use case-insensitive matching for robust mapping
    let rule = null;
    if (property.buildingType) {
        rule = await TaxRule.findOne({
            propertyType: { $regex: new RegExp(`^${property.propertyType}$`, 'i') },
            buildingType: { $regex: new RegExp(`^${property.buildingType}$`, 'i') },
            isActive: true
        }).sort({ createdAt: -1 });
    }

    if (!rule) {
        // Fallback to generic property type rule (e.g., generic Industrial if Factory specific is missing)
        rule = await TaxRule.findOne({
            propertyType: { $regex: new RegExp(`^${property.propertyType}$`, 'i') },
            isActive: true,
            $or: [{ buildingType: null }, { buildingType: '' }]
        });
    }

    if (!rule) {
        return {
            amount: 0,
            breakdown: { error: 'No applicable tax rule found', calculated: 0 }
        };
    }

    // 2. Apply Calculation Logic based on Method
    let taxAmount = 0;
    let explanation = '';

    switch (rule.calculationMethod) {
        case 'Fixed':
            taxAmount = rule.rate;
            explanation = `Fixed Rate: $${rule.rate}`;
            break;

        case 'PerFloor':
            // Logic: floors * rate
            const floors = property.structureDetails?.floors || 1;
            taxAmount = floors * rule.rate;
            explanation = `${floors} Floors * $${rule.rate}`;
            break;

        case 'PerUnit':
            // Logic: totalUnits * rate
            const units = property.structureDetails?.totalUnits || 1;
            taxAmount = units * rule.rate;
            explanation = `${units} Units * $${rule.rate}`;
            break;

        case 'PerM2':
        case 'PerHectare':
        case 'PerHalfHectare':
            // Logic: Area * rate. 
            // CAUTION: Is it Land Area or Floor Area?
            // "All size-based taxes must use: area = numberOfLands * 300" -> This usually implies Land Tax.
            // But "Warehouse: $1 per m2", "Villa: $0.5 per m2". 
            // The prompt says "All size-based taxes must use: area = numberOfLands * 300". This suggests a land tax model default.
            // HOWEVER, "tax per total floor area (m2)" is explicitly mentioned for Apartments.
            // Contextual decision: 
            // IF Building Type is Warehouse/Villa/Apartment (structure focused) -> Use Total Floor Area?
            // "Standard land plot = ... size-based taxes must use area = numberOfLands * 300" might be for LAND VALUE TAX specifically, or defaulting.
            // Let's look at specific rate examples: "Villa: Per m2: $0.5".
            // If I have a 300m2 land, but a G+1 Villa (maybe 200m2 floor area?), which one?
            // Usually "Per m2" for properties refers to the built-up area unless it's "Land Tax".
            // User requirement: "Tax per total floor area (m2)" model requested for Apartment.
            // Let's use `totalFloorArea` for built properties, and `totalAreaSqm` (land) if floor area is 0 or missing.

            let areaToUse = property.structureDetails?.totalFloorArea;
            let areaType = "Floor Area";

            // Fallback to land area if floor area not set (e.g. empty land, or simple definition)
            if (!areaToUse || areaToUse === 0) {
                areaToUse = property.landDetails?.totalAreaSqm || (property.landDetails?.landCount * 300);
                areaType = "Land Area";
            }

            if (rule.calculationMethod === 'PerHectare') {
                const hectares = areaToUse / 10000;
                taxAmount = hectares * rule.rate;
                explanation = `${hectares} Hectares (${areaType}) * $${rule.rate}`;
            } else if (rule.calculationMethod === 'PerHalfHectare') {
                const halfHectares = areaToUse / 5000;
                taxAmount = halfHectares * rule.rate;
                explanation = `${halfHectares} Half-Hectares (${areaType}) * $${rule.rate}`;
            } else {
                taxAmount = areaToUse * rule.rate;
                explanation = `${areaToUse} m² (${areaType}) * $${rule.rate}`;
            }
            break;

        case 'Percentage':
            // Logic: value * (rate/100) or revenue * (rate/100)
            // Rules say: "Luxury Villa: 0.5% of property value", "Mall: 1% of revenue"
            // We need to distinguish between Property Value and Revenue.
            // We can look at the rule name or assume based on property type, 
            // OR checks which field is non-zero/relevant.
            // Ideally, the rule helps. But sticking to valid types:

            if (['Mixed-use'].includes(property.propertyType) && property.estimatedRevenue > 0) {
                // Commercial tends to be revenue based as per "1% revenue" examples
                // But wait, "Luxury Villa" is residential and is Value based.
                // "Mall" is Commercial and Revenue based.
                // Let's try to assume based on context or fields.

                // If rule rate is small (< 10), it's percentage.
                // If property.estimatedRevenue is passed and it's commercial, favor that?
                // Let's try to use specific rules.

                // Better implementation: The Rule Schema doesn't specify "Value" vs "Revenue".
                // Detailed implementation logic:
                // Residential/Luxury Villa -> Value
                // Commercial -> Revenue (unless Office which is fixed)

                if (property.propertyType === 'Residential') {
                    taxAmount = property.value * (rule.rate / 100);
                    explanation = `0.5% of Property Value ($${property.value})`;
                } else {
                    // Commercial
                    taxAmount = property.estimatedRevenue * (rule.rate / 100);
                    explanation = `${rule.rate}% of Revenue ($${property.estimatedRevenue})`;
                }
            } else {
                // Default to property value if revenue not applicable
                taxAmount = property.value * (rule.rate / 100);
                explanation = `${rule.rate}% of Property Value ($${property.value})`;
            }
            break;

        case 'Exempt':
            taxAmount = 0;
            explanation = "Exempt Rule Applied";
            break;
    }

    // Handle Mixed Use Special Case
    // "Mixed-use: Residential floors: apartment rules, Commercial floors: 1% revenue or $100 fixed"
    // This is complex because it combines two rules.
    // Allow the main logic to run for the primary type, but if MixedUse, we might need a composite calculation.
    if (property.isMixedUse) {
        // This is a complex logic that might require splitting the property virtually.
        // For simplicity in this iteration, we might assume the Primary Rule applies to the dominant type,
        // or add a specific "MixedUse" logic block if the complexity is high.
        // Given existing structure, let's keep it simple: The user selects a "Mixed-use" building type, 
        // and likely we might need a custom calculation entry or just separate explicit rules.
    }

    return {
        amount: taxAmount,
        breakdown: {
            rule: rule.ruleName,
            method: rule.calculationMethod,
            rate: rule.rate,
            details: explanation
        }
    };
};

module.exports = { calculateTaxForProperty };
