using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

public class EmailService
{
    private readonly EmailSettings _settings;

    public EmailService(IOptions<EmailSettings> options)
    {
        _settings = options?.Value ?? throw new ArgumentNullException(nameof(options));

        // 🔍 DEBUG LINE 
        Console.WriteLine("FromEmail value: " + _settings.FromEmail);
    }

    // ✅ EXISTING METHOD (UNCHANGED)
    public async Task SendEmailAsync(string toEmail, string subject, string body)
    {
        if (string.IsNullOrWhiteSpace(toEmail))
            throw new ArgumentNullException(nameof(toEmail));

        if (string.IsNullOrWhiteSpace(_settings.FromEmail))
            throw new InvalidOperationException("FromEmail not configured.");

        if (string.IsNullOrWhiteSpace(_settings.SmtpHost))
            throw new InvalidOperationException("SmtpHost not configured.");

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_settings.FromName ?? "", _settings.FromEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject ?? string.Empty;

        var builder = new BodyBuilder
        {
            HtmlBody = body ?? string.Empty
        };

        message.Body = builder.ToMessageBody();

        using var client = new SmtpClient();

        var secure = _settings.UseSsl
            ? SecureSocketOptions.StartTls
            : SecureSocketOptions.Auto;

        await client.ConnectAsync(_settings.SmtpHost, _settings.SmtpPort, secure);

        if (!string.IsNullOrEmpty(_settings.Username))
        {
            await client.AuthenticateAsync(_settings.Username, _settings.Password);
        }

        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }

    // ✅ NEW METHOD: SEND EMAIL WITH PDF ATTACHMENT
    public async Task SendEmailWithAttachmentAsync(string toEmail, string subject, string body, byte[] fileBytes, string fileName)
    {
        if (string.IsNullOrWhiteSpace(toEmail))
            throw new ArgumentNullException(nameof(toEmail));

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_settings.FromName ?? "", _settings.FromEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject ?? string.Empty;

        var builder = new BodyBuilder
        {
            HtmlBody = body ?? string.Empty
        };

        // ✅ Attach PDF
        builder.Attachments.Add(fileName, fileBytes);

        message.Body = builder.ToMessageBody();

        using var client = new SmtpClient();

        var secure = _settings.UseSsl
            ? SecureSocketOptions.StartTls
            : SecureSocketOptions.Auto;

        await client.ConnectAsync(_settings.SmtpHost, _settings.SmtpPort, secure);

        if (!string.IsNullOrEmpty(_settings.Username))
        {
            await client.AuthenticateAsync(_settings.Username, _settings.Password);
        }

        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }

    // ✅ EXISTING SYNC WRAPPER (UNCHANGED)
    public void SendEmail(string email, string subject, string body)
    {
        SendEmailAsync(email, subject, body).GetAwaiter().GetResult();
    }
}