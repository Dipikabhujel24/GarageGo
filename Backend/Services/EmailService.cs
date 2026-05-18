using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System;

namespace Backend.Services
{
    public class EmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task SendEmailAsync(string to, string subject, string body)
        {
            var smtpHost = GetSetting("EmailSettings:SmtpHost", "SMTP_HOST");
            var smtpPortText = GetSetting("EmailSettings:SmtpPort", "SMTP_PORT");
            var smtpUser = GetSetting("EmailSettings:SmtpUser", "SMTP_USER");
            var smtpPass = GetSetting("EmailSettings:SmtpPass", "SMTP_PASS");
            var fromEmail = GetSetting("EmailSettings:FromEmail", "SMTP_FROM_EMAIL");

            if (string.IsNullOrWhiteSpace(smtpHost) || string.IsNullOrWhiteSpace(smtpUser) || string.IsNullOrWhiteSpace(smtpPass) || string.IsNullOrWhiteSpace(fromEmail) || !int.TryParse(smtpPortText, out var smtpPort))
            {
                throw new InvalidOperationException("SMTP settings are missing. Configure EmailSettings via user-secrets or environment variables.");
            }

            using var smtp = new SmtpClient(smtpHost)
            {
                Port = smtpPort,
                Credentials = new NetworkCredential(smtpUser, smtpPass),
                EnableSsl = true
            };

            using var mail = new MailMessage
            {
                From = new MailAddress(fromEmail),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };

            mail.To.Add(to);

            try
            {
                await smtp.SendMailAsync(mail);
                _logger.LogInformation("Email sent successfully");
            }
            catch (SmtpException smtpEx)
            {
                _logger.LogError(smtpEx, "Email send failed");
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Email send failed");
                throw;
            }
        }

        private string GetSetting(string configKey, string environmentKey)
        {
            var value = _config[configKey];
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }

            return Environment.GetEnvironmentVariable(environmentKey) ?? string.Empty;
        }
    }
}
