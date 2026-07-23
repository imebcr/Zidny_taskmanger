import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'

interface EmailPayload {
  to: string
  subject: string
  html: string
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  family: 4, // avoid hanging on unreachable IPv6 routes on hosts without IPv6 connectivity
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
} as SMTPTransport.Options)
 
export async function sendEmail({ to, subject, html }: EmailPayload) {
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.log(`[EMAIL - DEV] To: ${to}\nSubject: ${subject}`)
    return
  }
  try {
    await transporter.sendMail({
      from: `Zidny <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    })
  } catch (err) {
    console.error('Email send error:', err)
  }
}
 
export function taskAssignedEmail(toName: string, taskTitle: string, deadline: Date, appUrl: string, taskId: string) {
  return {
    subject: `[Zidny] Nouvelle tâche assignée : ${taskTitle}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#0C224B">Bonjour ${toName},</h2>
        <p>Une nouvelle tâche vous a été assignée :</p>
        <div style="background:#E9FCFF;border-left:4px solid #2AA4E7;padding:16px;border-radius:8px;margin:16px 0">
          <strong style="color:#0C224B">${taskTitle}</strong><br/>
          <span style="color:#0A60AD;font-size:14px">Échéance : ${deadline.toLocaleDateString('fr-FR', { dateStyle: 'full' })}</span>
        </div>
        <a href="${appUrl}/tasks/${taskId}" style="background:#2AA4E7;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;display:inline-block;font-weight:600">
          Voir la tâche
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px">Zidny — Gestionnaire de tâches</p>
      </div>
    `,
  }
}
 
export function deadlineReminderEmail(toName: string, taskTitle: string, deadline: Date, hours: number, appUrl: string, taskId: string) {
  return {
    subject: `[Zidny] Rappel : "${taskTitle}" — dans ${hours}h`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#0C224B">Bonjour ${toName},</h2>
        <p>La tâche suivante est due dans <strong>${hours} heures</strong> :</p>
        <div style="background:#FFF9E6;border-left:4px solid #D97706;padding:16px;border-radius:8px;margin:16px 0">
          <strong style="color:#0C224B">${taskTitle}</strong><br/>
          <span style="color:#D97706;font-size:14px">Échéance : ${deadline.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}</span>
        </div>
        <a href="${appUrl}/tasks/${taskId}" style="background:#2AA4E7;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;display:inline-block;font-weight:600">
          Voir la tâche
        </a>
      </div>
    `,
  }
}
 
export function overdueEmail(toName: string, taskTitle: string, appUrl: string, taskId: string) {
  return {
    subject: `[Zidny] Tâche en retard : "${taskTitle}"`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#DC2626">⚠ Tâche en retard</h2>
        <p>Bonjour ${toName},</p>
        <p>La tâche suivante est maintenant <strong>en retard</strong> :</p>
        <div style="background:#FEF2F2;border-left:4px solid #DC2626;padding:16px;border-radius:8px;margin:16px 0">
          <strong style="color:#0C224B">${taskTitle}</strong>
        </div>
        <a href="${appUrl}/tasks/${taskId}" style="background:#DC2626;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;display:inline-block;font-weight:600">
          Voir la tâche
        </a>
      </div>
    `,
  }
}
 
export function taskUpdatedEmail(toName: string, taskTitle: string, changes: string[], appUrl: string, taskId: string) {
  const changeItems = changes.map(c => `<li style="margin:4px 0">${c}</li>`).join('')
  return {
    subject: `[Zidny] Tâche modifiée : ${taskTitle}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#0C224B">Bonjour ${toName},</h2>
        <p>La tâche suivante a été modifiée par un administrateur :</p>
        <div style="background:#E9FCFF;border-left:4px solid #2AA4E7;padding:16px;border-radius:8px;margin:16px 0">
          <strong style="color:#0C224B">${taskTitle}</strong>
          <ul style="margin:8px 0 0;padding-left:18px;color:#0A60AD;font-size:14px">
            ${changeItems}
          </ul>
        </div>
        <a href="${appUrl}/tasks/${taskId}" style="background:#2AA4E7;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;display:inline-block;font-weight:600">
          Voir la tâche
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px">Zidny — Gestionnaire de tâches</p>
      </div>
    `,
  }
}

export function mentionEmail(toName: string, fromName: string, taskTitle: string, commentContent: string, appUrl: string, taskId: string) {
  return {
    subject: `[Zidny] ${fromName} vous a mentionné dans "${taskTitle}"`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#0C224B">Bonjour ${toName},</h2>
        <p><strong>${fromName}</strong> vous a mentionné dans un commentaire sur la tâche <strong>${taskTitle}</strong> :</p>
        <div style="background:#F5F3FF;border-left:4px solid #7C3AED;padding:16px;border-radius:8px;margin:16px 0;color:#4C1D95;font-style:italic">
          "${commentContent}"
        </div>
        <a href="${appUrl}/tasks/${taskId}" style="background:#2AA4E7;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;display:inline-block;font-weight:600">
          Voir la tâche
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px">Zidny — Gestionnaire de tâches</p>
      </div>
    `,
  }
}

export function weeklyReminderEmail(
  toName: string,
  myTasks: { title: string; deadline: Date; status: string }[],
  newTasks: { title: string; deadline: Date }[],
  overdueCount: number,
  appUrl: string,
) {
  const taskRows = myTasks.slice(0, 8).map(t =>
    `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${t.title}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#888;font-size:13px">${t.deadline.toLocaleDateString('fr-FR')}</td><td style="padding:6px 8px;border-bottom:1px solid #eee">${t.status}</td></tr>`
  ).join('')

  const newTaskItems = newTasks.map(t =>
    `<li style="margin:6px 0"><strong>${t.title}</strong> <span style="color:#888;font-size:13px">— échéance le ${t.deadline.toLocaleDateString('fr-FR')}</span></li>`
  ).join('')

  return {
    subject: `[Zidny] Résumé hebdomadaire du ${new Date().toLocaleDateString('fr-FR')}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#0C224B">Bonjour ${toName} 👋</h2>
        <p>Voici votre résumé pour cette semaine. Pensez à mettre à jour vos tâches sur <a href="${appUrl}/dashboard" style="color:#2AA4E7">Zidny</a>.</p>

        ${newTasks.length > 0 ? `
        <div style="background:#F0FDF4;border-left:4px solid #16A34A;padding:14px 16px;border-radius:8px;margin:16px 0">
          <strong style="color:#15803D">🆕 Nouvelles tâches cette semaine à renseigner :</strong>
          <ul style="margin:8px 0 0;padding-left:18px;color:#166534">
            ${newTaskItems}
          </ul>
        </div>` : ''}

        ${overdueCount > 0 ? `<div style="background:#FEF2F2;border-left:4px solid #DC2626;padding:12px 16px;border-radius:8px;margin:12px 0"><strong style="color:#DC2626">⚠ ${overdueCount} tâche${overdueCount > 1 ? 's' : ''} en retard</strong></div>` : ''}

        ${myTasks.length > 0 ? `
        <p style="font-weight:600;color:#0C224B;margin-top:20px">Toutes vos tâches en cours :</p>
        <table style="width:100%;border-collapse:collapse"><tr style="background:#E9FCFF"><th style="padding:8px;text-align:left;font-size:13px">Tâche</th><th style="padding:8px;text-align:left;font-size:13px">Échéance</th><th style="padding:8px;text-align:left;font-size:13px">Statut</th></tr>${taskRows}</table>` : '<p style="color:#888">Aucune tâche assignée.</p>'}

        <a href="${appUrl}/dashboard" style="background:#2AA4E7;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;display:inline-block;font-weight:600;margin-top:20px">
          Accéder à Zidny
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px">Zidny — Gestionnaire de tâches</p>
      </div>
    `,
  }
}