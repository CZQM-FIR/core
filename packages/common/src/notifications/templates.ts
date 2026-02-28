type UnauthorizedConnectionSession = {
  cid: number;
  position: {
    callsign: string;
    name: string;
  };
  logonTime: Date;
};

type UnauthorizedConnectionUser = {
  name_full: string;
  cid: number;
};

export const unauthorizedConnectionText = (
  session: UnauthorizedConnectionSession,
  user: UnauthorizedConnectionUser,
  reason: string,
) => {
  return [
    `Hello ${user.name_full} (${user.cid}),`,
    `At ${session.logonTime.toUTCString()}, we detected a connection to the VATSIM network that, according to our records, you were not authorized to make.`,
    `Reason for unauthorized connection: ${reason}\nPosition: ${session.position.name} (${session.position.callsign})`,
    `We ask that you please disconnect from the network while the incident is being reviewed. If you believe this was done in error, please respond to this message. A member of the CZQM team will be in touch.`,
    `Best regards,\nCZQM Team`,
  ].join("\n\n");
};

export const unauthorizedConnectionEmailTemplate = (
  session: UnauthorizedConnectionSession,
  user: UnauthorizedConnectionUser,
  reason: string,
) => {
  const subject = "CZQM - Unauthorized Connection";
  const replyto = "administration@czqm.ca";
  const bcc = ["administration@czqm.ca"];

  const text = unauthorizedConnectionText(session, user, reason);
  const paragraphs = text.split("\n\n");

  const body = /*html*/ `
  <html>
    <body>
      ${paragraphs
        .map((p) => {
          const html = p.replace(/\n/g, "<br/>");
          return `<p>${html}</p>`;
        })
        .join("\n      ")}
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
