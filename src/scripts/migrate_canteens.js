require('dotenv').config();
const mongoose = require('mongoose');
const { Canteen } = require('../models');

const migrateCanteens = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-cafe';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const desiredNames = ["Sopanam", "Prasada", "Samudra"];
        const existingCanteens = await Canteen.find({});

        if (existingCanteens.length === 0) {
            console.log("No canteens found. Creating the 3 default canteens...");
            for (const name of desiredNames) {
                await Canteen.create({
                    name: name,
                    capacity: 150,
                    status: 'Open',
                    crowd: 'Low',
                    description: `${name} dining area.`
                });
            }
            console.log("Created canteens:", desiredNames.join(", "));
        } else {
            console.log(`Found ${existingCanteens.length} existing canteen(s).`);
            
            // Check if we already have the new names
            let hasSopanam = false;
            let hasPrasada = false;
            let hasSamudra = false;

            for (const c of existingCanteens) {
                if (c.name === "Sopanam") hasSopanam = true;
                if (c.name === "Prasada") hasPrasada = true;
                if (c.name === "Samudra") hasSamudra = true;
            }

            if (hasSopanam && hasPrasada && hasSamudra) {
                console.log("All desired canteens already exist. No migration needed.");
            } else {
                // We have some existing canteens but not exactly ["Sopanam", "Prasada", "Samudra"]
                // Let's rename the primary one to "Sopanam" if "Sopanam" doesn't exist
                if (!hasSopanam && existingCanteens.length > 0) {
                    const primary = existingCanteens[0];
                    console.log(`Renaming ${primary.name} to Sopanam to preserve external references...`);
                    primary.name = "Sopanam";
                    primary.description = "Sopanam dining area.";
                    await primary.save();
                    hasSopanam = true;
                }

                if (!hasPrasada) {
                    console.log("Creating Prasada canteen...");
                    await Canteen.create({
                        name: "Prasada",
                        capacity: 150,
                        status: 'Open',
                        crowd: 'Low',
                        description: `Prasada dining area.`
                    });
                }

                if (!hasSamudra) {
                    console.log("Creating Samudra canteen...");
                    await Canteen.create({
                        name: "Samudra",
                        capacity: 150,
                        status: 'Open',
                        crowd: 'Low',
                        description: `Samudra dining area.`
                    });
                }
                
                // If there are other remaining canteens (index > 0), mark them inactive or just leave them
                for (let i = 1; i < existingCanteens.length; i++) {
                    const extra = existingCanteens[i];
                    if (!desiredNames.includes(extra.name)) {
                        console.log(`Marking extraneous canteen ${extra.name} as inactive.`);
                        extra.isActive = false;
                        await extra.save();
                    }
                }
            }
        }

        console.log('✅ Canteen migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateCanteens();
