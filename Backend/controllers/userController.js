import validator from "validator";
import bcrypt from "bcrypt";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import Razorpay from "razorpay";
//import orders from "razorpay/dist/types/orders.js";

//API to register user
const registerUser = async (req, res) => {
  try {
    console.log(req.body);
    const { name, email, password } = req.body;
   // console.log(name);

    if (!name || !password || !email) {
      return res.json({ success: false, message: "Missing Details" });
    }

    // vaslidating email formate
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Enter a Valid Email" });
    }

    // validating strong password
    if (password.length < 8) {
      return res.json({ success: false, message: "Enter a Strong Password" });
    }

    // Hashing user password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      name,
      email,
      password: hashedPassword,
    };

    const newUser = new userModel(userData);
    console.log("register successfully");
    const user = await newUser.save();
    console.log("register successfully 2");
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({ success: true, token });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API for user Login

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "user does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const token = jwt.sign({ id:user._id }, process.env.JWT_SECRET);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid Credential" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//API to get user profile data

const getProfile = async (req, res) => {
  try {
    console.log("get-profile route hit");
    console.log("req.user mila kya?", req.user);

    const userId = req.user.userId;
    console.log("userId is", userId);

    const userData = await userModel.findById(userId).select("-password");

    res.json({ success: true, userData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};



//API to update user profile

const updateProfile = async (req, res) => {
  try {
    console.log("update1");
    const { userId, name, phone, address, dob, gender } = req.body
    console.log(userId);
    //const imageFile = req.imageFile
    const imageFile = req.file

    if (!name || !phone || !dob || !gender) {
      console.log("update2");
      return res.json({ success: false, message: "Data Missing" })
    }
    console.log("update3");
    await userModel.findByIdAndUpdate(userId, {
      name,
      phone,
      address: JSON.parse(address),
      dob,
      gender,
    })
    console.log("update3.1");
    if (imageFile) {
      console.log(imageFile);
      console.log("update4");
      // upload image to cloudinary

      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: 'image'});
      const imageURL = imageUpload.secure_url

      await userModel.findByIdAndUpdate(userId, { image: imageURL })
    }

    res.json({ success: true, message: "Profile Updated" });

  } catch (error) {
    console.log("update error");
    console.log(error);
    res.json({ success: false, message: error.message });
  }
}


// API to book appointment

 const bookAppointment = async (req, res) => {
  try {
    console.log("📌 bookAppointment body:", req.body);
    console.log("📌 bookAppointment userId:", req.user.userId);

    //const userId=req.userId
    const userId = req.user.userId;
    const { docId, slotDate, slotTime } = req.body;

    if (!userId || !docId || !slotDate || !slotTime) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const docData = await doctorModel.findById(docId).select("-password");
    if (!docData.available) {
      return res.json({ success: false, message: "Doctor Not Available" });
    }

    let slots_booked = docData.slots_booked || {};

    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        return res.json({ success: false, message: "Slot Not Available" });
      } else {
        slots_booked[slotDate].push(slotTime);
      }
    } else {
      slots_booked[slotDate] = [slotTime];
    }

    const userData = await userModel.findById(userId).select("-password");
    delete docData.slots_booked;

    const appointmentData = {
      userId,
      docId,
      userData,
      docData,
      amount: docData.fees,
      slotTime,
      slotDate,
      date: Date.now(),
    };

    const newAppointment = new appointmentModel(appointmentData);
    await newAppointment.save();

    await doctorModel.findByIdAndUpdate(docId, { slots_booked });

    res.json({ success: true, message: "Appointment Booked" });
  } catch (error) {
    console.log("❌ bookAppointment error:", error.message);
    res.json({ success: false, message: error.message });
  }
};


// API to get user appointment for frontend my-appointment page
const listAppointment = async (req,res)=>{

  try {

   // const {userId} = req.body
      const userId = req.user.userId
    const appointments = await appointmentModel.find({userId})

    res.json({success:true,appointments})
    
  } catch (error) {

    console.log("❌ bookAppointment error:", error.message);
    res.json({ success: false, message: error.message });
    
  }
}


// API to cancell Appointment

const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const userId = req.user.userId; // ✅ middleware se aa raha hai

    console.log("Cancelling appointment:", appointmentId);
    console.log("Requested by user:", userId);

    // appointment fetch karo
    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    // verify appointment belongs to the logged-in user
    if (appointmentData.userId !== userId) {
      return res.json({ success: false, message: "Unauthorized action" });
    }

    // update appointment as cancelled
    await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

    // doctor slot release
    const { docId, slotDate, slotTime } = appointmentData;
    const doctorData = await doctorModel.findById(docId);

    if (doctorData && doctorData.slots_booked && doctorData.slots_booked[slotDate]) {
      doctorData.slots_booked[slotDate] = doctorData.slots_booked[slotDate].filter(
        (e) => e !== slotTime
      );
      await doctorModel.findByIdAndUpdate(docId, { slots_booked: doctorData.slots_booked });
    }

    res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.log("❌ cancelAppointment error:", error.message);
    res.json({ success: false, message: error.message });
  }
};


// API to make payment of Appointment using Razorpay
const razorpayInstance = new Razorpay({
  key_id:process.env.RAZORPAY_KEY_ID,
  key_secret:process.env.RAZORPAY_KEY_SECRET
})

const paymentRazorpay = async (req,res) => {

  try {

    const {appointmentId} = req.body
  
  const appointmentData = await appointmentModel.findById(appointmentId)

  if(!appointmentData || appointmentData.cancelled){
    return res.json({success:false,message:'Appointment Cancelled or not found'})
  }

   // creating options for razorpay  payment
   const options ={
    amount:appointmentData.amount * 100,
    currency: process.env.CURRENCY,
    receipt:appointmentId
   }

   // creation of an order

   const order = await razorpayInstance.orders.create(options)

   res.json({success:true,order})
    
  } catch (error) {

    console.log(error);
    res.json({ success: false, message: error.message });
    
  }

}

//Api to verify payment of razorpay
const verifyRazorpay = async (req,res) =>{
  try {

    const {razorpay_order_id} = req.body
    const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)

if(orderInfo.status==='paid'){
   await appointmentModel.findByIdAndUpdate(orderInfo.receipt,{payment:true})
   res.json({success:true,message:'Payment Successful'})
}
else{
   res.json({success:false,message:'Payment failed'})
}
    
  } catch (error) {
       console.log(error);
       res.json({ success: false, message: error.message });
    
  }
}


export { registerUser, loginUser, getProfile, updateProfile ,bookAppointment ,listAppointment,cancelAppointment,paymentRazorpay,verifyRazorpay}
