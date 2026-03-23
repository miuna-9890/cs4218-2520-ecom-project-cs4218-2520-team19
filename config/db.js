import mongoose from "mongoose";
import colors from "colors";
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URL);
        console.log(`Connected To Mongodb Database ${conn.connection.host}`.bgMagenta.white);
    } catch (error) {
        console.log(`Error in Mongodb ${error}`.bgRed.white);
    }
};

const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
    } catch (error) {
        console.log(`Error disconnecting from Mongodb ${error}`.bgRed.white);
    }
};

export { connectDB, disconnectDB };