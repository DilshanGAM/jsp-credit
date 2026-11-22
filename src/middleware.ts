
import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';


export async function middleware( req : NextRequest ) {
    // "user" is internal: it is set below from a verified token and trusted by every route,
    // so a request that arrives with one is forged.
    if(req.headers.has("user")){
        return NextResponse.json({ message: "The user header is not allowed" }, { status: 403 });
    }

    try{
      //check if there is a token in the request header
      const token = req.headers.get("Authorization");

      if(token){
          // The Android app's customer search sends the token without "Bearer ", so both forms must work.
          const user = await jose.jwtVerify(token.replace("Bearer ",""),new TextEncoder().encode(process.env.JOSE_SECRET));
          
          if(user){
            req.headers.set("user",JSON.stringify(user.payload));
          }
      }
      //add all data of the request and send it to the next middleware
    }catch(e){
        console.log(e);
    }

    return NextResponse.next({
        request: req
    });
}

// Apply the middleware to all API routes
export const config = {
    matcher: ['/api/:path*']
};