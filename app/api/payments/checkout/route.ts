import { NextRequest, NextResponse } from 'next/server';
import pricing from '@/content/pricing.json';
function inMonths(m: number){ const d=new Date(); d.setMonth(d.getMonth()+m); return d.toISOString(); }
function inYears(y: number){ const d=new Date(); d.setFullYear(d.getFullYear()+y); return d.toISOString(); }
export async function POST(req: NextRequest){
  const body=await req.json().catch(()=>({})); const id=body.productId||'pro_monthly';
  const plan=pricing.plans.find(p=>p.id===id); const top=pricing.topups.find(t=>t.id===id);
  const res=NextResponse.json({ ok:true, product:id });
  if (top){
    const cur=parseInt(req.cookies.get('javari_credits')?.value||'0',10);
    res.cookies.set('javari_credits', String(cur + (top.credits||0)), { httpOnly:false, sameSite:'lax', path:'/' });
    return res;
  }
  if (!plan) return NextResponse.json({ ok:false, error:'invalid_product' }, { status:400 });
  const yearly = plan.period==='year';
  const planCode = plan.id.startsWith('pro') ? 'PRO' : (plan.id.startsWith('elite') ? 'ELITE' : 'FREE');
  const credits = plan.includedCredits || 0;
  res.cookies.set('javari_plan', planCode, { httpOnly:false, sameSite:'lax', path:'/' });
  res.cookies.set('javari_credits', String(credits), { httpOnly:false, sameSite:'lax', path:'/' });
  res.cookies.set('javari_term_end', yearly ? inYears(1) : inMonths(1), { httpOnly:false, sameSite:'lax', path:'/' });
  res.cookies.set('javari_cancel', '0', { httpOnly:false, sameSite:'lax', path:'/' });
  return res;
}
