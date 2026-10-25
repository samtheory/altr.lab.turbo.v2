export type OutboundMail = {
  to: string;
  subject: string;
  text: string;
};

/** Confirm and reset mail. Console adapter is the only phase-02 implementation. */
export interface MailerPort {
  send(message: OutboundMail): Promise<void>;
}

export class ConsoleMailer implements MailerPort {
  readonly sent: OutboundMail[] = [];

  async send(message: OutboundMail): Promise<void> {
    this.sent.push(message);
    console.info(
      `[@altr/jord-server] mail to=${message.to} subject=${message.subject}`,
    );
  }
}
