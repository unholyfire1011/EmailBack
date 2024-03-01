const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const registerUser = require('./models/users.js')
var nodemailer = require('nodemailer');
const multer = require('multer');
const uuid = require('uuid');
const crypto = require('crypto');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

cloudinary.config({ 
  cloud_name: 'dwx6cpsxg', 
  api_key: '373737764535832', 
  api_secret: 'NmoyX4rv9jCWQbFIZK8CP9FdyEk' 
});

require('dotenv').config()

const app = express();
app.use(cors())
app.use(express.json())
app.use('/', express.static('uploads'))


mongoose.connect(process.env.URL).catch(err=> {
    console.log(err);
}); 




app.post('/register', async (req,res)=>{
    const name = req.body.name;
    const mail = req.body.mail;
    const pass = req.body.pass;
    const salt = bcrypt.genSaltSync(12);
    const hash = bcrypt.hashSync(pass, salt);
    await registerUser.findOne({"mail":`${mail}`}).then(user=>{
        if(user == {} || user == null){
            registerUser.create({
                name: name,
                mail: mail,
                password: hash
            }).then(
                res.json("Registered successfully")
            ).catch(err=>{
                res.json(err)
            })
        }else{
           res.status(201).json("User already exists");
        }
    })
   
    
})

app.post('/login', async (req, res)=>{
    const uname = req.body.uname;
    const pass = req.body.pass;
    await registerUser.findOne({"mail":`${uname}`}).then(user=>{
        if(user == null){
            res.status(201).json("The Email Entered Was Incorrect!!")
        }else{
            const match = bcrypt.compareSync(pass, user.password);
            if(match){
                res.status(200).json(user.id);
                
            }else{
                res.status(201).json("Incorrect Password Entered!!!");
            }
        }
    }).catch(error=>{
        res.status(201).json("Some Error Occured");
    })
})


app.post('/getUser', async (req, res)=> {
    const id = req.body.id;
    
    await registerUser.findOne({"_id": id}).then(user=>{
        res.status(200).json(user)
    }).catch(error=>{
        res.status(201).json("Server Error Cant Send Mail");
    })
})

const storage = multer.diskStorage({
    destination: function (req,file,cb){
        return cb(null, "./uploads")
    },
    filename: function (req,file,cb){
        return cb(null, `${Date.now()}_${file.originalname}`)
    }
})

const upload = multer({storage})


app.post('/sendMsg', upload.single('file') ,async (req, res)=>{
    const date = new Date();
    const to = req.body.to;
    const from = req.body.from;
    if(req.file){
          try{
            const result = await cloudinary.uploader.upload(req.file.path)
            File = result.secure_url;
        }catch(err){
            res.status(201).send("Error sending message try again after sometime!!");
          }
    }else{
        File = "";
    }
    const rMsg = {
        "date": date,
        "from": from,
        "msg": req.body.encryptedData,
        "file": File
    }
    const sMsg = {
        "date": date,
        "to": to,
        "msg" : req.body.encryptedData,
        "file": File 
    }
    
   await registerUser.findOne({"mail": to}).then(async user=>{
    if(user==null){
        res.status(201).json("The User You Are Trying To Reach Doesn't exist");
    }else{
        const [blocked] = user.blocked;
        if(blocked == null || blocked==undefined){
            await registerUser.updateOne({"mail": user.mail}, {$push: {"rMessages": rMsg}}).then(async r=>{
                await registerUser.updateOne({"mail": from}, {$push: {"sMessages": sMsg}}).then(r=>{
                  res.status(200).json("Message sent successfully");
              }).catch(err=>{
                  res.status(201).json("Some Error Occured");
              })
              }).catch(err=>{
                  res.status(201).json("Some Error Occured");
             })   
        }else{
        const {User, id} = blocked;
        if(User === from){
            res.status(201).json("Cant Send The Message As You Have Been Blocked By The User");
        }
    }
    }
   }).catch(err=>{
       res.status(201).json("Some Error Occured");
       console.log(err);
   })
})


app.post('/fetchData', async(req,res)=>{
    const id = req.body.id;
    await registerUser.findOne({"_id": id}).then(async user=>{
        if(user.rMessages == null){
            res.status(201).json("No Messages To Fetch")
        }else{
        res.send(user.rMessages);
        }
    })
})


app.post('/fetchSentData', async(req,res)=>{
    const id = req.body.id;
    await registerUser.findOne({"_id": id}).then(async user=>{
        if(user.sMessages == null){
            res.status(201).json("No Messages To Fetch")
        }else{
        res.send(user.sMessages);
        }
    })
})

app.post('/fetchSpamData', async(req,res)=>{
    const id = req.body.id;
    await registerUser.findOne({"_id": id}).then(async user=>{
        if(user == null){
            res.status(201).json("No Messages To Fetch")
        }else{
        res.send(user.spam);
        }
    })
})

app.post('/deleteMsg', async(req,res)=>{
   const messageId =  req.body.id;
   const userId = req.body.userId;
   const file = req.body.file;
   await registerUser.updateOne({"_id": userId}, {$pull:{"rMessages": {"_id": messageId}}}).then(r=>{
      if(r==null){
        res.status(201).json("Error")
      }else{
        res.status(200).json("Message Deleted Successfully!!")
      }
   })
})

app.post('/deleteSentMsg', async(req,res)=>{
    const messageId =  req.body.id;
    const userId = req.body.userId;
    await registerUser.updateOne({"_id": userId}, {$pull:{"sMessages": {"_id": messageId}}}).then(r=>{
       if(r==null){
         res.status(201).json("Error")
       }else{
         res.status(200).json("Message deleted successfully");
       }
    })
 })

app.post('/deleteMsgSpam', async(req,res)=>{
    const messageId =  req.body.id;
    const userId = req.body.userId;
    await registerUser.updateOne({"_id": userId}, {$pull:{"spam": {"_id": messageId}}}).then(r=>{
       if(r==null){
         res.status(201).json("Error")
       }else{
         res.status(200).json("Message deleted successfully");
       }
    })
 })

app.post('/blockUser', async(req,res)=>{
    const userId=req.body.userId;
    const blockUser = req.body.from;
    const id = req.body.id;
    const bu = {
        "User": blockUser
    }
   
    await registerUser.findOne({"_id": userId}, {"blocked": {"_id": id}}).then(r=>{
        if(r.blocked.length != 0){
            res.status(201).send("The User Is Already Blocked");   
        }else{
            registerUser.updateOne({"_id": userId}, {$push:{"blocked": bu}}).then(r=>{
                if(r==null){
                    res.status(201).json("Error");         
                  }else{
                    res.status(200).json("The User Was Blocked SuccessFully");            
                  }
            }).catch(err=>{
               res.status(201).send("Server Error!!! Try Again After Sometime");         
        })
        }
    })

})

app.post('/spam', async(req,res)=>{
    const id = req.body.userId;
    const date = req.body.date;
    const from = req.body.from;
    const msgId = req.body.msgId;
    const msg = req.body.msg;
    const file = req.body.file;
    const spamMessage = {
        "date": date,
        "from": from,
        "msg": msg,
        "file": file
    }
    await registerUser.updateOne({"_id": id}, {$push:{"spam": spamMessage}}).then(async r1=>{
        if(r1 == null){
         
            res.status(201).send("Error Adding to Spam!! Try Again After Sometime")
        }else{
            await registerUser.updateOne({"_id": id}, {$pull: {"rMessages": {"_id": msgId}}}).then(async r2=>{
                if(r2==null){
                    
                    res.status(201).send("Error Adding to Spam!! Try Again After Sometime")
                }else{
                    res.status(200).send("Added To Spam Successfully!");
                    
                }
            }).catch(err=>{
              
                res.status(201).send("Error Adding to Spam!! Try Again After Sometime")
            })
        }
    }).catch(err=>{
         console.log(err);
        res.status(201).send("Error Adding to Spam!! Try Again After Sometime")
})
})

app.post('/restore', async(req,res)=>{
    const userId = req.body.userId;
    const date  = req.body.date;
    const from = req.body.from;
    const msg = req.body.msg;
    const itemId = req.body.itemId;
    const file  = req.body.file;
    const Message = {
        "date":date,
        "from":from,
        "msg": msg,
        "file": file
    }
    await registerUser.updateOne({"_id": userId}, {$push:{"rMessages": Message}}).then(async r=>{
        if(r==null){
            res.status(201).send("Could Not Restore This Back To Inbox At The Moment!! Please Try Again Later")
        }else{
            await registerUser.updateOne({"_id": userId}, {$pull:{"spam": {"_id": itemId}}}).then(r2=>{
                res.status(200).send("Message Restored To Inbox Succsssfully!!")
            }).catch(err=>{
                res.status(201).send("Could Not Restore This  Back To Inbox At The Moment!! Please Try Again Later")
            })
        }
    }).catch(err=>{
        res.status(201).send("Could Not Restore This  Back To Inbox At The Moment!! Please Try Again Later")
    })
})


app.post('/fetchBlockedData', async(req,res)=>{
    const id = req.body.id;
    await registerUser.findOne({"_id": id}).then(async user=>{
        if(user == null){
            res.status(201).json("No Users To Fetch")
        }else{
        res.send(user.blocked);
        }
    }).catch(err=>{
        res.status(201).json("Some Error Ocurred Try Again After Sometime!!");
    })
})


app.post('/restoreBlocked', async(req,res)=>{
    const id = req.body.id;
    const user = req.body.User;
    const userId = req.body.userId;
    await registerUser.updateOne({"_id": userId}, {$pull:{"blocked":{"_id": id}}}).then(async r=>{
        if(r==null){
            res.status(201).json("Error Restoring The User At The Moment");
        }else{
            res.status(200).json("User Restored Successfully!!");
        }
    }).catch(err=>{
        res.status(201).json("Error Restoring The User At The Moment");
    })
  
})

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'purab.manglani@gmail.com',
      pass: 'bksr iqab osna jeiu'
    }
  });

app.post('/forgotPass', async (req,res)=>{

    var fUrl = `https://emailsys.netlify.app/resetPass?userName=${req.body.username}`;
    var mailOptions = {
        from: 'purab.manglani@gmail.com',
        to: req.body.username,
        subject: 'Account Recovery',
        text: fUrl
    };
    
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          res.send("Error!! Please Try AgainAfter Sometime");
        } else {
          res.send("A reset email link has been sent to you!!"); 
        }
    })
})

app.post('/resetPass', async (req, res)=>{
    await registerUser.findOne({"mail":`${req.body.username}`}).then(user=>{
        if(user == null){
            res.status(201).json("Recheck Your Username")
        }else{
            const match = bcrypt.compareSync(req.body.password, user.password);
            if(match){
                res.status(201).json("Use A Password You Have Not Used Before");
            }else{
                const salt = bcrypt.genSaltSync(12);
                const hash = bcrypt.hashSync(req.body.password, salt);
                registerUser.updateOne({"mail": req.body.username}, {"password": hash}).then(r2=>{
                    res.status(200).send("Password Was Reset Successfully!!");
                }).catch(err=>{
                    res.status(201).send("Some Error Occured!!")
                })
            }
        }
    }).catch(error=>{
        res.status(201).json("Some Error Occured");
    })
})



app.listen(process.env.PORT, ()=>{
    console.log("App is running on port", process.env.PORT);
})
