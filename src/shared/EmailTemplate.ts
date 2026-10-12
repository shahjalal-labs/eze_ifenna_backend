export const emailBody = (username: string, otp: string) => {
  const html = `
  <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
    <div style="max-width: 500px; margin: auto; background: #fff; border-radius: 10px; box-shadow: 0px 4px 10px rgba(0,0,0,0.1); overflow: hidden;">
      
      <!-- Header -->
     <div style="background-color: #14e36aff; padding: 20px; text-align: center;">
        <img src="https://api.zenexcloud.com/emdadullah/uploads/messages/files/1772768338388-s0e9xze2d8i.jpg" alt="Company Logo" style="height: 80px; margin-bottom: 10px;" />
        <h2 style="color: #fff; margin: 0;">Sign Up Verification</h2>
      </div>

      <!-- Body -->
      <div style="padding: 30px; text-align: center;">
        <p style="font-size: 16px; color: #c776ff; margin-bottom: 20px;">
          Hi <b>${username}</b>,
        </p>
        <p style="font-size: 16px; color: #555;">
          Your verification code is:
        </p>

        <h1 style="color: #c776ff; font-size: 36px; margin: 15px 0;">${otp}</h1>

        <p style="font-size: 14px; color: #777;">
          This OTP is valid for <b>5 minutes</b>. If you did not request this, you can safely ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #aaa;">
        &copy; ${new Date().getFullYear()} HODS. All rights reserved.
      </div>
    </div>
  </div>
  `;
  return html;
};
export const markActiveMessage = (userName: string) => {
  const html = `
  <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; background-color: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 10px; color: #333;">
    <div style="background-color: #14e36aff; padding: 20px; text-align: center;">
        <img src="https://api.zenexcloud.com/emdadullah/uploads/messages/files/1772768338388-s0e9xze2d8i.jpg" alt="Company Logo" style="height: 80px; margin-bottom: 10px;" />
        <h2 style="color: #fff; margin: 0;">Account Verified Successfully</h2>
      </div>
       <div style="padding: 20px;">
 <p style="font-size: 16px;">Hi <b>${userName}</b>,</p>

    <p style="font-size: 15px; line-height: 1.6;">
      Great news! Your account has been <span style="color: #28a745; font-weight: bold;">successfully verified</span> by our team.
    </p>

    <p style="font-size: 15px; line-height: 1.6;">
      You can now log in to your account and start renting your properties to tenants.
    </p>

    <div style="background-color: #e6f9ec; padding: 15px 20px; border-left: 5px solid #c776ff; margin: 20px 0; border-radius: 5px;">
      <p style="margin: 0; font-size: 15px;">
        ✅ <b>Next Step:</b> <span style="color: #c776ff; display="inline">Log in</span> And start creating your service.
      </p>
    </div>

    <p style="font-size: 15px; line-height: 1.6;">
      If you need any assistance, feel free to reach out to our support team.
    </p>

    <p style="font-size: 15px; margin-top: 30px;">Thanks,<br><span style="color: #007BFF;">HODS</span></p>
       </div>

   
  </div>
`;
  return html;
};
