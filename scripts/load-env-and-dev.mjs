#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Load .env.local and set environment variables
const envPath = path.resolve('.env.local');
const envVars = {};

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        let value = trimmed.substring(eqIndex + 1).trim();
        
        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        envVars[key] = value;
      }
    }
  });
  console.log(`✓ Loaded .env.local (${Object.keys(envVars).length} variables)`);
}

// Merge loaded env vars with process.env
const env = Object.assign({}, process.env, envVars);

// Spawn npm run dev with merged env
const proc = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env,
  cwd: process.cwd(),
});

proc.on('exit', (code) => process.exit(code));
