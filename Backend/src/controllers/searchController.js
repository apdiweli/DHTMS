const Property = require('../models/Property');
const Owner = require('../models/Owner');

exports.globalSearch = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim() === '') {
            return res.json({ properties: [], owners: [] });
        }

        const regex = new RegExp(q, 'i'); // Case insensitive search

        const [properties, owners] = await Promise.all([
            Property.find({
                $or: [
                    { address: regex },
                    { district: regex },
                    { taxAccountNumber: regex },
                    { zone: regex },
                    { id: regex }
                ]
            }).limit(5).select('address district taxAccountNumber propertyType zone id'),

            Owner.find({
                $or: [
                    { name: regex },
                    { contact: regex },
                    { id: regex }
                ]
            }).limit(5).select('name contact id')
        ]);

        res.json({
            properties,
            owners
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Search failed' });
    }
};
