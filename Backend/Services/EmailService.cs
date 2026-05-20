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

        public bool IsConfigured()
        {
            var smtpHost = GetSetting("EmailSettings:SmtpHost", "SMTP_HOST");
            var smtpPortText = GetSetting("EmailSettings:SmtpPort", "SMTP_PORT");
            var smtpUser = GetSetting("EmailSettings:SmtpUser", "SMTP_USER");
            var smtpPass = GetSetting("EmailSettings:SmtpPass", "SMTP_PASS");
            var fromEmail = GetSetting("EmailSettings:FromEmail", "SMTP_FROM_EMAIL");

            return !string.IsNullOrWhiteSpace(smtpHost)
                && !string.IsNullOrWhiteSpace(smtpUser)
                && !string.IsNullOrWhiteSpace(smtpPass)
                && !string.IsNullOrWhiteSpace(fromEmail)
                && int.TryParse(smtpPortText, out _);
        }

        public async Task SendEmailAsync(string to, string subject, string body)
        {
            if (string.IsNullOrWhiteSpace(to))
            {
                throw new ArgumentException("Recipient email is required.", nameof(to));
            }

            var smtpHost = GetSetting("EmailSettings:SmtpHost", "SMTP_HOST");
            var smtpPortText = GetSetting("EmailSettings:SmtpPort", "SMTP_PORT");
            var smtpUser = GetSetting("EmailSettings:SmtpUser", "SMTP_USER");
            var smtpPass = GetSetting("EmailSettings:SmtpPass", "SMTP_PASS");
            var fromEmail = GetSetting("EmailSettings:FromEmail", "SMTP_FROM_EMAIL");

            if (!int.TryParse(smtpPortText, out var smtpPort))
            {
                smtpPort = 587;
            }

            if (string.IsNullOrWhiteSpace(smtpHost)
                || string.IsNullOrWhiteSpace(smtpUser)
                || string.IsNullOrWhiteSpace(smtpPass)
                || string.IsNullOrWhiteSpace(fromEmail))
            {
                throw new InvalidOperationException(
                    "SMTP settings are missing. Set EmailSettings in appsettings.Development.json or environment variables (SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL).");
            }

            using var smtp = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new NetworkCredential(smtpUser, smtpPass),
                EnableSsl = true,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false
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
                _logger.LogInformation("Email sent to {Recipient} with subject {Subject}", to, subject);
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

        public async Task SendEmailWithAttachmentAsync(
            string to,
            string subject,
            string body,
            byte[] fileBytes,
            string fileName)
        {
            if (string.IsNullOrWhiteSpace(to))
            {
                throw new ArgumentException("Recipient email is required.", nameof(to));
            }

            if (fileBytes == null || fileBytes.Length == 0)
            {
                throw new ArgumentException("Attachment content is required.", nameof(fileBytes));
            }

            var smtpHost = GetSetting("EmailSettings:SmtpHost", "SMTP_HOST");
            var smtpPortText = GetSetting("EmailSettings:SmtpPort", "SMTP_PORT");
            var smtpUser = GetSetting("EmailSettings:SmtpUser", "SMTP_USER");
            var smtpPass = GetSetting("EmailSettings:SmtpPass", "SMTP_PASS");
            var fromEmail = GetSetting("EmailSettings:FromEmail", "SMTP_FROM_EMAIL");

            if (!int.TryParse(smtpPortText, out var smtpPort))
            {
                smtpPort = 587;
            }

            if (string.IsNullOrWhiteSpace(smtpHost)
                || string.IsNullOrWhiteSpace(smtpUser)
                || string.IsNullOrWhiteSpace(smtpPass)
                || string.IsNullOrWhiteSpace(fromEmail))
            {
                throw new InvalidOperationException(
                    "SMTP settings are missing. Set EmailSettings in appsettings.Development.json or environment variables.");
            }

            using var smtp = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new NetworkCredential(smtpUser, smtpPass),
                EnableSsl = true,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false
            };

            using var mail = new MailMessage
            {
                From = new MailAddress(fromEmail),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };

            mail.To.Add(to);
            mail.Attachments.Add(new Attachment(new MemoryStream(fileBytes), fileName, "application/pdf"));

            try
            {
                await smtp.SendMailAsync(mail);
                _logger.LogInformation("Email with attachment sent to {Recipient}", to);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Email with attachment failed for {Recipient}", to);
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
