
const express = require("express");
const { User } = require("./mongoDB");

const app = express();
var cors = require("cors");

// app.use(cors({ origin: '*', optionsSuccessStatus: 200, credentials: true }));
// app.options("*",cors({ origin: true, optionsSuccessStatus: 200, credentials: true }));
const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE');
  res.setHeader('Access-Control-Allow-Methods','Content-Type','Authorization');
  next(); 
})

app.use(express.json());

app.get("/", oauth);
app.get("/validate-callback", validateCallback);

const port = 5000;
app.listen(port);


async function validateCallback(req, res) {
    try {
      console.log(req.query);
      console.log(req.params);
      const { code } = req.query;
      console.log({ code });
  
      const googleRedirectUrl = `http://localhost:5000/validate-callback`;
  
      const data = {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_SECRET_KEY,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: googleRedirectUrl,
      };
      console.dir({ data }, { depth: null });
      let config = {
        method: "post",
        url: "https://oauth2.googleapis.com/token",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        data: qs.stringify(data),
      };
      console.dir({ config }, { depth: null });
  
      const response = await axios(config);
  
      console.log(response.data);
      const id_token = response.data.id_token;
      const url = `https://oauth2.googleapis.com/tokeninfo?${id_token}`;
  
      console.log(url);
  
      let configs = {
        method: "get",
        url: `https://oauth2.googleapis.com/tokeninfo?id_token=${id_token}`,
        headers: {},
      };
  
      const userInfo = await axios(configs);
  
      console.log(userInfo.data);
  
      const userData = await User.findOneAndUpdate(
        {
          email: userInfo.data.email,
        },
        {
          name: userInfo.data.name,
          email: userInfo.data.email,
        },
        {
          upsert: true,
          new: true,
        }
      );
  
      if (!userData) {
        return res.status(401).json({
          success: false,
          message: "Login again, please try again",
        });
      }
  
      return res.redirect(
        `http://localhost:3000/?email=${userInfo.data.email}&name=${userInfo.data.name}`
      );
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  };
  
async function oauth(req, res) {
    console.log('auth');
    const options = {
      redirect_uri: "http://localhost:5000/validate-callback",
      client_id: process.env.GOOGLE_CLIENT_ID,
      access_type: "offline",
      // state: `[${brandId}__123,${redirectUri}]`,
      response_type: "code",
      prompt: "consent",
      scope: [
        "email",
        "profile",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid",
      ].join(" "),
    };
    const qs = new URLSearchParams(options);
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${qs.toString()}`;
    return res.redirect(url);
  };

