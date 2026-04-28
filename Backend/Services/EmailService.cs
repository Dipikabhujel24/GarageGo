using System.Net;
using System.Net.Mail;

namespace Backend.Services
{
    public class EmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendEmailAsync(string to, string subject, string body)
        {
            using var smtp = new SmtpClient(_config["EmailSettings:SmtpHost"])
            {
                Port = int.Parse(_config["EmailSettings:SmtpPort"]!),
                Credentials = new NetworkCredential(
                    _config["EmailSettings:SmtpUser"],
                    _config["EmailSettings:SmtpPass"]
                ),
                EnableSsl = true
            };

            using var mail = new MailMessage
            {
                From = new MailAddress(_config["EmailSettings:FromEmail"]!),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };

            mail.To.Add(to);
            await smtp.SendMailAsync(mail);
        }
    }
}
