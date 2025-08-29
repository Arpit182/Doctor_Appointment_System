  import mongoose from 'mongoose'

 const connectDB = async () =>{

    mongoose.connection.on('connected', ()=> console.log("Database connected"))
    
    await mongoose.connect(`${process.env.MONGODB_URI}/prescripto`)

 }

 export default connectDB


// import mongoose from 'mongoose';

// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGODB_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });

//     mongoose.connection.on('connected', () => {
//       console.log("✅ Database connected");
//     });

//   } catch (err) {
//     console.error("❌ MongoDB connection error:", err.message);
//     process.exit(1);
//   }
// };

// export default connectDB;


