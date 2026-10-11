// Pass the configured key only through the child environment, never logs or files.
require('@next/env').loadEnvConfig(process.cwd());const {spawnSync}=require('child_process'),path=require('path');
if(!process.env.OPENAI_API_KEY){console.error('OPENAI_API_KEY is not configured.');process.exit(1);}
const result=spawnSync('python',[path.join(__dirname,'cli-meter.py'),...process.argv.slice(2)],{env:process.env,stdio:'inherit'});process.exit(result.status??1);
