import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(email: string, username: string, code: string): Promise<void> {
    const html = this.getVerificationEmailTemplate(username, code);

    await this.transporter.sendMail({
      from: `"SuperSkin" <${this.configService.get<string>('SMTP_USER')}>`,
      to: email,
      subject: 'SuperSkin - 邮箱验证码',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, username: string, code: string): Promise<void> {
    const html = this.getPasswordResetEmailTemplate(username, code);

    await this.transporter.sendMail({
      from: `"SuperSkin" <${this.configService.get<string>('SMTP_USER')}>`,
      to: email,
      subject: 'SuperSkin - 密码重置验证码',
      html,
    });
  }

  async sendWelcomeEmail(email: string, username: string): Promise<void> {
    const html = this.getWelcomeEmailTemplate(username);

    await this.transporter.sendMail({
      from: `"SuperSkin" <${this.configService.get<string>('SMTP_USER')}>`,
      to: email,
      subject: '欢迎加入 SuperSkin',
      html,
    });
  }

  private getVerificationEmailTemplate(username: string, code: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 28px; font-weight: bold; color: #0055B9; }
          .content { background: #f9f9f9; border-radius: 8px; padding: 40px; }
          .code-box { background: #0055B9; color: white; padding: 20px 40px; border-radius: 8px; 
                      font-size: 32px; letter-spacing: 8px; text-align: center; margin: 24px 0; }
          .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SuperSkin</div>
          </div>
          <div class="content">
            <h2>您好，${username}！</h2>
            <p>感谢您注册 SuperSkin。请使用以下验证码完成邮箱验证：</p>
            <div class="code-box">${code}</div>
            <p style="color: #666; font-size: 14px; text-align: center;">
              此验证码将在 24 小时后过期。
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              如果您没有注册 SuperSkin，请忽略此邮件。
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} 北域工作室. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetEmailTemplate(username: string, code: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 28px; font-weight: bold; color: #0055B9; }
          .content { background: #f9f9f9; border-radius: 8px; padding: 40px; }
          .code-box { background: #0055B9; color: white; padding: 20px 40px; border-radius: 8px; 
                      font-size: 32px; letter-spacing: 8px; text-align: center; margin: 24px 0; }
          .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SuperSkin</div>
          </div>
          <div class="content">
            <h2>您好，${username}！</h2>
            <p>我们收到了重置您密码的请求。请使用以下验证码重置密码：</p>
            <div class="code-box">${code}</div>
            <p style="color: #666; font-size: 14px; text-align: center;">
              此验证码将在 1 小时后过期。
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              如果您没有请求重置密码，请忽略此邮件。
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} 北域工作室. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getWelcomeEmailTemplate(username: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 28px; font-weight: bold; color: #0055B9; }
          .content { background: #f9f9f9; border-radius: 8px; padding: 40px; }
          .feature { margin: 20px 0; padding: 16px; background: white; border-radius: 6px; }
          .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SuperSkin</div>
          </div>
          <div class="content">
            <h2>欢迎加入 SuperSkin，${username}！</h2>
            <p>您的邮箱已验证成功，现在可以开始使用 SuperSkin 创建您的专属 Minecraft 皮肤了！</p>
            
            <div class="feature">
              <h3>🎨 图片转皮肤</h3>
              <p>上传任意图片，自动转换为 Minecraft 皮肤格式</p>
            </div>
            
            <div class="feature">
              <h3>✏️ 像素编辑器</h3>
              <p>精细调整每一个像素，打造独一无二的皮肤</p>
            </div>
            
            <div class="feature">
              <h3>🔄 云端同步</h3>
              <p>您的皮肤将安全存储在云端，随时随地访问</p>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} 北域工作室. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
