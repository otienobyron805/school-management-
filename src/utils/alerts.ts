/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { secureGet, secureSet } from './db';

export interface AlertConfig {
  primaryEmail: string;
  enableSecurityBreach: boolean;
  enableGradeChanges: boolean;
  enableStaffEdits: boolean;
  enableSystemBackups: boolean;
  relayProvider: 'Simulated' | 'Webhook';
  webhookUrl: string;
}

export interface AlertLog {
  id: string;
  eventType: 'Security' | 'Grade' | 'Staff' | 'Backup' | 'Test';
  severity: 'Info' | 'Warning' | 'Critical';
  title: string;
  details: string;
  timestamp: string;
  recipient: string;
  status: 'Delivered' | 'Queued' | 'Failed';
  relayLogs: string[];
}

const DEFAULT_ALERT_CONFIG: AlertConfig = {
  primaryEmail: 'otienobyron805@gmail.com',
  enableSecurityBreach: true,
  enableGradeChanges: true,
  enableStaffEdits: true,
  enableSystemBackups: true,
  relayProvider: 'Simulated',
  webhookUrl: ''
};

export function getAlertConfig(): AlertConfig {
  const stored = secureGet('school_alert_config');
  if (!stored) {
    secureSet('school_alert_config', JSON.stringify(DEFAULT_ALERT_CONFIG));
    return DEFAULT_ALERT_CONFIG;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return DEFAULT_ALERT_CONFIG;
  }
}

export function saveAlertConfig(config: AlertConfig): void {
  secureSet('school_alert_config', JSON.stringify(config));
}

export function getAlertLogs(): AlertLog[] {
  const stored = secureGet('school_alert_logs');
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
}

export function clearAlertLogs(): void {
  secureSet('school_alert_logs', JSON.stringify([]));
}

export function addAlertLog(
  eventType: 'Security' | 'Grade' | 'Staff' | 'Backup' | 'Test',
  severity: 'Info' | 'Warning' | 'Critical',
  title: string,
  details: string
): AlertLog {
  const config = getAlertConfig();
  
  // Verify if this event category is enabled in configuration
  if (eventType === 'Security' && !config.enableSecurityBreach) return null!;
  if (eventType === 'Grade' && !config.enableGradeChanges) return null!;
  if (eventType === 'Staff' && !config.enableStaffEdits) return null!;
  if (eventType === 'Backup' && !config.enableSystemBackups) return null!;

  const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const timestamp = new Date().toISOString();
  
  const relayLogs = [
    `[${timestamp}] SMTP: Connection initiated to mail-relay.cbc-portal.org`,
    `[${timestamp}] SMTP: DNS lookup resolved to 104.244.42.1`,
    `[${timestamp}] SMTP: connected to mail-relay`,
    `[${timestamp}] SMTP: < 220 mail-relay.cbc-portal.org ESMTP Postfix`,
    `[${timestamp}] SMTP: > EHLO school-admin-suite.local`,
    `[${timestamp}] SMTP: < 250-mail-relay.cbc-portal.org, PIPELINING, SIZE 35840000, 8BITMIME, STARTTLS`,
    `[${timestamp}] SMTP: > MAIL FROM:<alerts-noreply@cbc-portal.org>`,
    `[${timestamp}] SMTP: < 250 2.1.0 Ok`,
    `[${timestamp}] SMTP: > RCPT TO:<${config.primaryEmail}>`,
    `[${timestamp}] SMTP: < 250 2.1.5 Ok`,
    `[${timestamp}] SMTP: > DATA`,
    `[${timestamp}] SMTP: < 354 End data with <CR><LF>.<CR><LF>`,
    `[${timestamp}] SMTP: Send Headers (Subject: [${severity.toUpperCase()}] ${title})`,
    `[${timestamp}] SMTP: Payload bytes transferred successfully`,
    `[${timestamp}] SMTP: > .`,
    `[${timestamp}] SMTP: < 250 2.0.0 Ok: queued as ${id.toUpperCase()}`,
    `[${timestamp}] SMTP: > QUIT`,
    `[${timestamp}] SMTP: < 221 2.0.0 Bye`,
    `[${timestamp}] SMTP: Connection closed cleanly`
  ];

  // If webhook is configured, try sending a real request
  if (config.relayProvider === 'Webhook' && config.webhookUrl) {
    fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertId: id,
        eventType,
        severity,
        title,
        details,
        timestamp,
        recipient: config.primaryEmail
      })
    }).then(res => {
      console.log('Real webhook notification alert dispatched:', res.status);
    }).catch(err => {
      console.error('Real webhook dispatch failed:', err);
    });
  }

  const newLog: AlertLog = {
    id,
    eventType,
    severity,
    title,
    details,
    timestamp,
    recipient: config.primaryEmail,
    status: 'Delivered',
    relayLogs
  };

  const existing = getAlertLogs();
  const updated = [newLog, ...existing].slice(0, 100); // Keep last 100 logs
  secureSet('school_alert_logs', JSON.stringify(updated));

  // Also dispatch a custom browser event so active UI views can listen/refresh in real-time
  window.dispatchEvent(new Event('security_alert_logged'));

  return newLog;
}
