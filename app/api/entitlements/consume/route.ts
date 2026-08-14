import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest){
  const { cost=1 } = await req.json().catch(()=>({}));
  const c = parseInt(req.cookies.get('javari_credits')?.value || '0', 10);
  if (c < cost) return NextResponse.json({ ok:false, error:'insufficient_credits', credits:c }, { status: 402 });
  const res = NextResponse.json({ ok:true, credits: c - cost });
  res.cookies.set('javari_credits', String(c - cost), { httpOnly:false, sameSite:'lax', path:'/' });
  return res;
}
