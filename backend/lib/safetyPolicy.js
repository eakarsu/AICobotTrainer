const crypto=require('crypto');class SafetyError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const text=(v,n,max=2000)=>{if(typeof v!=='string'||!v.trim())throw new SafetyError(`${n} is required`);const x=v.trim();if(x.length>max)throw new SafetyError(`${n} is too long`);return x;};
function canonical(v){if(Array.isArray(v))return`[${v.map(canonical).join(',')}]`;if(v&&typeof v==='object')return`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;return JSON.stringify(v);}
function verifyTelemetry(payload,signature,publicKey){try{return crypto.verify(null,Buffer.from(canonical(payload)),publicKey,Buffer.from(signature,'base64'));}catch{return false;}}
function transition(from,to){const map={pending_review:['acknowledged','dismissed'],acknowledged:['intervention_requested','closed'],intervention_requested:['approved','cancelled'],approved:['closed']};if(!(map[from]||[]).includes(to))throw new SafetyError(`Invalid transition ${from} -> ${to}`);return to;}
function confidence(value){const n=Number(value);if(!Number.isFinite(n)||n<0||n>1)throw new SafetyError('confidence must be between 0 and 1');return n;}
function requireRole(role,allowed){if(!allowed.includes(role))throw new SafetyError('Operator/safety role required',403);}function idempotency(req){const k=req.get('Idempotency-Key');if(!k||!/^[\w.:-]{8,128}$/.test(k))throw new SafetyError('Valid Idempotency-Key required');return k;}
module.exports={SafetyError,text,canonical,verifyTelemetry,transition,confidence,requireRole,idempotency};
