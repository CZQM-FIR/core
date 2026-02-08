import { User } from "@czqm/db/schema";

export const unauthorizedConnectionEmailTemplate = (
  session: {
    cid: number;
    position: {
      callsign: string;
      name: string;
    };
    logonTime: Date;
  },
  user: User,
  reason: string
) => {
  const subject = "CZQM - Unauthorized Connection";
  const replyto = "administration@czqm.ca";
  const bcc = ["administration@czqm.ca"];
  const body = /*html*/ `
  <html>
    <body>
      <p>Hello ${user.name_full} (${user.cid}),</p>
      <p>
        At ${session.logonTime.toUTCString()}, we detected a connection to the VATSIM network that, according to our records, you were not authorized to make.
      </p>
      <p>
        Reason for unauthorized connection: <strong>${reason}</strong><br>
        Position: ${session.position.name} (${session.position.callsign})<br>
      </p>
      <p>
        We ask that you please disconnect from the network while the incident is being reviewed. 
        If you believe this was done in error, please respond to this email. A member of the CZQM team will be in touch.
      </p>
      <p>Best regards,<br/>CZQM Team</p>
      <p><em>This is an automated message. This message was sent in accordance with <a href="https://czqm.ca/privacy">CZQM's Privacy Policy</a></em></p>
    </body>
  </html>
  `;

  return JSON.stringify({
    subject,
    body,
    replyto,
    bcc,
  });
};
