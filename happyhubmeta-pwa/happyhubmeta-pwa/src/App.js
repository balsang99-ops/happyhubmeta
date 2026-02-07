import { useState, useEffect, useCallback } from "react";

const MEMBERS_KEY = "hhm-members";
const AUTH_KEY = "hhm-session";
const DEVICES_KEY = "hhm-devices-v2";

const TIERS = {
  founder: { label: "파운더회원", icon: "👑", color: "#F59E0B", desc: "1억 이상 투자자", badge: "FOUNDER", urlLabel: "URL (자유)", urlPlaceholder: "어떠한 URL도 가능", urlHint: "개인 블로그, 포트폴리오, 홈페이지 등 기타 어떤 URL이든 등록 가능" },
  business: { label: "비즈니스회원", icon: "🏢", color: "#3B82F6", desc: "대표 / 사업자", badge: "BUSINESS", urlLabel: "회사 홈페이지 또는 상품페이지 URL", urlPlaceholder: "https://www.회사명.com 또는 상품페이지", urlHint: "회사 공식 홈페이지 또는 대표 상품 판매 페이지 URL" },
  expert: { label: "전문가회원", icon: "🎓", color: "#8B5CF6", desc: "재능서비스 전문가", badge: "EXPERT", urlLabel: "운영 홈페이지 또는 SNS URL", urlPlaceholder: "https://본인 홈페이지 또는 SNS", urlHint: "본인이 직접 운영하는 홈페이지 또는 SNS (인스타, 유튜브 등)" },
  celeb: { label: "셀럽회원", icon: "⭐", color: "#F43F5E", desc: "판매자 회원", badge: "CELEB", urlLabel: "SNS 페이지 URL", urlPlaceholder: "https://instagram.com/아이디 등", urlHint: "인스타그램, 유튜브, 틱톡 등 본인 SNS 페이지" },
};

const P = {
  bg: "#05080F", card: "#0C1220", cardAlt: "#111B2E",
  border: "#1A2744", blue: "#3B82F6", indigo: "#6366F1", violet: "#8B5CF6",
  gold: "#F59E0B", amber: "#FBBF24", teal: "#14B8A6", emerald: "#10B981",
  rose: "#F43F5E", red: "#EF4444", sky: "#38BDF8",
  text: "#E8ECF4", muted: "#8B95A8", dim: "#5A6478", white: "#FFFFFF",
};

const App = () => {
  const [phase, setPhase] = useState("loading");
  const [members, setMembers] = useState([]);
  const [currentMember, setCurrentMember] = useState(null);
  const [loginStep, setLoginStep] = useState("select"); // select | pin | register-admin
  const [selectedTier, setSelectedTier] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name:"",phone:"",email:"",bizNumber:"",kakaoId:"",url:"",address:"",addressDetail:"",tier:"founder",pin:"" });
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState("members");
  const [activeCell, setActiveCell] = useState(null);
  const [view, setView] = useState("canvas");
  const [showPhilosophy, setShowPhilosophy] = useState(true);
  const [regStep, setRegStep] = useState(1);

  useEffect(() => {
    const init = async () => {
      try {
        const r = await window.storage.get(MEMBERS_KEY);
        const m = r ? JSON.parse(r.value) : [];
        setMembers(m);
        try {
          const s = await window.storage.get(AUTH_KEY);
          if (s) {
            const sess = JSON.parse(s.value);
            const member = m.find(x => x.id === sess.memberId);
            if (member && Date.now() - sess.time < 24*60*60*1000) {
              setCurrentMember(member);
              setPhase("main");
              return;
            }
          }
        } catch(e) {}
        setPhase("login");
      } catch(e) { setMembers([]); setPhase("login"); }
    };
    init();
  }, []);

  const saveMembers = async (list) => {
    try { await window.storage.set(MEMBERS_KEY, JSON.stringify(list)); } catch(e) {}
    setMembers(list);
  };

  const handleLogin = async () => {
    if (!selectedTier) { setError("회원 유형을 선택하세요"); return; }
    if (pin.length < 4) { setError("PIN 4자리 이상 입력하세요"); return; }
    const member = members.find(m => m.tier === selectedTier && m.pin === pin);
    if (!member) {
      setError("등록된 회원 정보를 찾을 수 없습니다. 사전 등록된 회원만 접근 가능합니다.");
      setPin("");
      return;
    }
    try {
      await window.storage.set(AUTH_KEY, JSON.stringify({ memberId: member.id, time: Date.now() }));
    } catch(e) {}
    setCurrentMember(member);
    setPhase("main");
    setPin(""); setError("");
  };

  const handleRegister = async () => {
    const t = TIERS[form.tier];
    if (!form.name.trim()) { setError("이름을 입력하세요"); return; }
    if (!form.phone.trim() || form.phone.replace(/\D/g,"").length < 10) { setError("휴대폰번호를 정확히 입력하세요"); return; }
    if (!form.email.includes("@")) { setError("이메일을 정확히 입력하세요"); return; }
    if (form.tier === "business") {
      if (form.bizNumber.replace(/\D/g,"").length !== 10) { setError("사업자번호 10자리를 입력하세요"); return; }
    }
    if (!form.kakaoId.trim()) { setError("카카오톡 ID를 입력하세요"); return; }
    if (!form.url.trim()) { setError(`${TIERS[form.tier].urlLabel}을 입력하세요`); return; }
    if (!form.address.trim()) { setError("주소를 입력하세요"); return; }
    if (form.pin.length < 4 || form.pin.length > 8) { setError("PIN은 4~8자리로 설정하세요"); return; }
    const phoneClean = form.phone.replace(/\D/g,"");
    const dup = members.find(m => m.phone === phoneClean && m.tier === form.tier);
    if (dup) { setError("이미 등록된 휴대폰번호입니다"); return; }

    const newMember = {
      id: `HHM-${form.tier.charAt(0).toUpperCase()}${String(members.filter(m=>m.tier===form.tier).length+1).padStart(4,"0")}`,
      tier: form.tier, name: form.name.trim(), phone: phoneClean,
      email: form.email.trim(),
      bizNumber: form.tier === "business" ? form.bizNumber.replace(/\D/g,"") : "",
      kakaoId: form.kakaoId.trim(), kakaoUrl: "https://pf.kakao.com/_dxaGZn/chat?bot=true",
      url: form.url.trim(), address: form.address.trim() + (form.addressDetail ? " " + form.addressDetail.trim() : ""), pin: form.pin,
      registeredAt: new Date().toISOString(),
      status: "active",
    };
    const updated = [...members, newMember];
    await saveMembers(updated);
    setForm({ name:"",phone:"",email:"",bizNumber:"",kakaoId:"",url:"",address:"",addressDetail:"",tier:"founder",pin:"" });
    setError(""); setRegStep(1); setLoginStep("select");
    alert(`${TIERS[form.tier].label} "${newMember.name}"님 등록 완료! (${newMember.id})`);
  };

  const removeMember = async (id) => {
    const updated = members.filter(m => m.id !== id);
    await saveMembers(updated);
  };

  const handleLogout = async () => {
    try { await window.storage.delete(AUTH_KEY); } catch(e) {}
    setCurrentMember(null); setPhase("login"); setView("canvas"); setActiveCell(null);
    setLoginStep("select"); setSelectedTier(null);
  };

  const maskId = (id, len) => {
    if (len === 10) return id.substring(0,3) + "-**-*****";
    return id.substring(0,3) + "***";
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;900&display=swap');
    @keyframes fi { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes glow { 0%,100%{box-shadow:0 0 20px ${P.rose}15} 50%{box-shadow:0 0 40px ${P.rose}30} }
    @keyframes spin { to{transform:rotate(360deg)} }
    *{box-sizing:border-box} input:focus,select:focus,textarea:focus{outline:none}
    input,select,textarea{font-family:'Noto Sans KR',sans-serif}
  `;
  const inputStyle = { width:"100%",padding:"10px 14px",borderRadius:10,background:P.bg,border:`1px solid ${P.border}`,color:P.text,fontSize:13,transition:"border .2s" };
  const labelStyle = { color:P.muted,fontSize:11,fontWeight:600,display:"block",marginBottom:4 };

  // ========== LOADING ==========
  if (phase === "loading") return (
    <div style={{fontFamily:"'Noto Sans KR',sans-serif",background:P.bg,color:P.text,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{css}</style>
      <div style={{textAlign:"center"}}>
        <div style={{width:40,height:40,border:`3px solid ${P.border}`,borderTopColor:P.blue,borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 16px"}}/>
        <div style={{color:P.muted,fontSize:13}}>회원 인증 확인 중...</div>
      </div>
    </div>
  );

  // ========== LOGIN / REGISTER ==========
  if (phase === "login") return (
    <div style={{fontFamily:"'Noto Sans KR',sans-serif",background:P.bg,color:P.text,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <style>{css}</style>
      <div style={{width:"100%",maxWidth:440,animation:"fi .5s ease"}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:64,height:64,borderRadius:18,margin:"0 auto 12px",background:`linear-gradient(135deg,${P.blue},${P.violet})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,boxShadow:`0 8px 32px ${P.blue}30`}}>🏠</div>
          <h1 style={{fontSize:20,fontWeight:900,margin:"0 0 2px",background:`linear-gradient(135deg,${P.blue},${P.violet})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>해피허브메타</h1>
          <div style={{color:P.muted,fontSize:11}}>MEMBERSHIP PLATFORM · PRIVATE ACCESS</div>
        </div>

        <div style={{background:P.card,borderRadius:16,padding:24,border:`1px solid ${P.border}`}}>

          {/* Step: Select Tier & PIN */}
          {loginStep === "select" && (<>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{color:P.text,fontSize:14,fontWeight:700,marginBottom:2}}>🔐 멤버십 로그인</div>
              <div style={{color:P.dim,fontSize:10}}>사전 등록된 회원만 접근할 수 있습니다</div>
            </div>

            <label style={labelStyle}>회원 유형 선택</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {Object.entries(TIERS).map(([k,v])=>(
                <div key={k} onClick={()=>{setSelectedTier(k);setError("")}} style={{
                  padding:"10px",borderRadius:10,cursor:"pointer",textAlign:"center",
                  background:selectedTier===k?`${v.color}15`:P.bg,
                  border:`1px solid ${selectedTier===k?v.color:P.border}`,transition:"all .2s"}}>
                  <div style={{fontSize:20}}>{v.icon}</div>
                  <div style={{color:selectedTier===k?v.color:P.muted,fontSize:11,fontWeight:600,marginTop:2}}>{v.label}</div>
                  <div style={{color:P.dim,fontSize:9}}>{v.desc}</div>
                </div>
              ))}
            </div>

            <label style={labelStyle}>인증 PIN</label>
            <input type="password" maxLength={8} value={pin} onChange={e=>{setPin(e.target.value);setError("")}}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="PIN 입력 (4~8자리)"
              style={{...inputStyle,textAlign:"center",letterSpacing:6,fontSize:18,marginBottom:12,borderColor:error?P.red:P.border}} />

            {error && <div style={{color:P.red,fontSize:11,textAlign:"center",marginBottom:10,background:`${P.red}10`,padding:8,borderRadius:8}}>⚠️ {error}</div>}

            <button onClick={handleLogin} style={{width:"100%",padding:12,borderRadius:10,border:"none",
              background:`linear-gradient(135deg,${P.blue},${P.violet})`,color:P.white,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:10}}>
              로그인
            </button>

            <div style={{textAlign:"center"}}>
              <button onClick={()=>{setLoginStep("register-admin");setError("");setRegStep(1)}}
                style={{background:"none",border:"none",color:P.dim,fontSize:10,cursor:"pointer",textDecoration:"underline"}}>
                관리자: 신규 회원 등록 →
              </button>
            </div>
          </>)}

          {/* Register Admin */}
          {loginStep === "register-admin" && (<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <div style={{color:P.text,fontSize:14,fontWeight:700}}>📋 신규 회원 등록</div>
                <div style={{color:P.dim,fontSize:10}}>관리자 전용 — 단계 {regStep}/3</div>
              </div>
              <button onClick={()=>{setLoginStep("select");setError("");setRegStep(1)}} style={{background:"none",border:`1px solid ${P.border}`,color:P.muted,padding:"4px 10px",borderRadius:6,cursor:"pointer",fontSize:10}}>← 돌아가기</button>
            </div>

            {/* Progress */}
            <div style={{display:"flex",gap:4,marginBottom:16}}>
              {[1,2,3].map(s=>(
                <div key={s} style={{flex:1,height:3,borderRadius:2,background:s<=regStep?P.blue:P.border,transition:"all .3s"}}/>
              ))}
            </div>

            {regStep === 1 && (<>
              <label style={labelStyle}>회원 유형 *</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
                {Object.entries(TIERS).map(([k,v])=>(
                  <div key={k} onClick={()=>setForm({...form,tier:k})} style={{
                    padding:8,borderRadius:8,cursor:"pointer",textAlign:"center",
                    background:form.tier===k?`${v.color}15`:P.bg,
                    border:`1px solid ${form.tier===k?v.color:P.border}`}}>
                    <span style={{fontSize:16}}>{v.icon}</span>
                    <div style={{color:form.tier===k?v.color:P.muted,fontSize:10,fontWeight:600}}>{v.label}</div>
                    <div style={{color:P.dim,fontSize:8}}>{v.desc}</div>
                  </div>
                ))}
              </div>

              <label style={labelStyle}>이름 (실명) *</label>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="홍길동" style={{...inputStyle,marginBottom:10}} />

              <label style={labelStyle}>📱 휴대폰번호 (인증용) *</label>
              <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}
                placeholder="010-0000-0000" style={{...inputStyle,marginBottom:2}} />
              <div style={{color:P.teal,fontSize:9,marginBottom:10,padding:"2px 4px"}}>💡 휴대폰번호가 본인 인증 수단으로 사용됩니다</div>

              {form.tier === "business" && (<>
                <label style={labelStyle}>사업자번호 10자리 *</label>
                <input value={form.bizNumber} onChange={e=>setForm({...form,bizNumber:e.target.value.replace(/[^0-9-]/g,"")})}
                  placeholder="000-00-00000" maxLength={12} style={{...inputStyle,marginBottom:10}} />
              </>)}

              <button onClick={()=>{
                if(!form.name.trim()){setError("이름을 입력하세요");return}
                if(!form.phone.trim()||form.phone.replace(/\D/g,"").length<10){setError("휴대폰번호를 정확히 입력하세요");return}
                if(form.tier==="business"&&form.bizNumber.replace(/\D/g,"").length!==10){setError("사업자번호 10자리를 입력하세요");return}
                setError("");setRegStep(2)
              }} style={{width:"100%",padding:10,borderRadius:10,border:"none",background:P.blue,color:P.white,fontSize:13,fontWeight:600,cursor:"pointer"}}>
                다음 단계 →
              </button>
            </>)}

            {regStep === 2 && (<>
              <label style={labelStyle}>이메일 *</label>
              <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
                placeholder="example@email.com" style={{...inputStyle,marginBottom:10}} />

              <label style={labelStyle}>카카오톡 ID *</label>
              <input value={form.kakaoId} onChange={e=>setForm({...form,kakaoId:e.target.value})}
                placeholder="카카오톡 ID" style={{...inputStyle,marginBottom:8}} />

              {/* 해피허브메타 카카오채널 고정 */}
              <div style={{background:`${P.gold}08`,border:`1px solid ${P.gold}25`,borderRadius:10,padding:"10px 14px",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{color:P.gold,fontSize:11,fontWeight:700,marginBottom:2}}>💬 해피허브메타 카카오톡채널</div>
                    <div style={{color:P.dim,fontSize:9}}>자동 연결됨 (필수 채널 추가)</div>
                  </div>
                  <button onClick={()=>window.open("https://pf.kakao.com/_dxaGZn/chat?bot=true","_blank")}
                    style={{background:`linear-gradient(135deg, #FEE500, #F5D900)`,border:"none",
                      borderRadius:8,padding:"8px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,
                      boxShadow:"0 2px 8px rgba(254,229,0,0.3)"}}>
                    <span style={{fontSize:16}}>💛</span>
                    <span style={{color:"#3C1E1E",fontSize:11,fontWeight:700}}>해피허브메타</span>
                  </button>
                </div>
                <div style={{color:P.muted,fontSize:8,marginTop:6,wordBreak:"break-all"}}>
                  🔗 https://pf.kakao.com/_dxaGZn/chat?bot=true
                </div>
              </div>

              <label style={labelStyle}>🔗 {TIERS[form.tier].urlLabel} *</label>
              <input value={form.url} onChange={e=>setForm({...form,url:e.target.value})}
                placeholder={TIERS[form.tier].urlPlaceholder} style={{...inputStyle,marginBottom:2}} />
              <div style={{color:TIERS[form.tier].color,fontSize:9,marginBottom:10,padding:"2px 4px"}}>💡 {TIERS[form.tier].urlHint}</div>

              {/* 주소 입력 */}
              <label style={labelStyle}>📍 주소 *</label>
              <input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}
                placeholder="예: 서울시 강서구 등촌로 195" style={{...inputStyle,marginBottom:4}} />
              <input value={form.addressDetail||""} onChange={e=>setForm({...form,addressDetail:e.target.value})}
                placeholder="상세주소 입력 (동/호수 등)" style={{...inputStyle,marginBottom:12}} />

              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setRegStep(1);setError("")}} style={{flex:1,padding:10,borderRadius:10,background:"none",border:`1px solid ${P.border}`,color:P.muted,fontSize:12,cursor:"pointer"}}>← 이전</button>
                <button onClick={()=>{
                  if(!form.email.includes("@")){setError("이메일을 입력하세요");return}
                  if(!form.kakaoId.trim()){setError("카카오톡 ID를 입력하세요");return}
                  if(!form.url.trim()){setError(`${TIERS[form.tier].urlLabel}을 입력하세요`);return}
                  if(!form.address.trim()){setError("주소를 입력하세요");return}
                  setError("");setRegStep(3)
                }} style={{flex:2,padding:10,borderRadius:10,border:"none",background:P.blue,color:P.white,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                  다음 단계 →
                </button>
              </div>
            </>)}

            {regStep === 3 && (<>
              <label style={labelStyle}>로그인 PIN 설정 (4~8자리) *</label>
              <input type="password" value={form.pin} onChange={e=>setForm({...form,pin:e.target.value})}
                placeholder="••••" maxLength={8} style={{...inputStyle,textAlign:"center",letterSpacing:6,fontSize:18,marginBottom:14}} />

              {/* Summary */}
              <div style={{background:P.bg,borderRadius:10,padding:14,marginBottom:14,border:`1px solid ${P.border}`}}>
                <div style={{color:TIERS[form.tier].color,fontSize:12,fontWeight:700,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                  <span>{TIERS[form.tier].icon}</span>{TIERS[form.tier].label} 등록 정보 확인
                </div>
                {[
                  ["이름",form.name],
                  ["📱 휴대폰번호 (인증)",form.phone],
                  ...(form.tier==="business"?[["사업자번호",maskId(form.bizNumber.replace(/\D/g,""),10)]]:[]),
                  ["이메일",form.email],
                  ["카카오톡 ID",form.kakaoId],
                  ["카카오채널","해피허브메타 (자동연결)"],
                  [TIERS[form.tier].urlLabel, form.url],
                  ["주소",form.address + (form.addressDetail ? " " + form.addressDetail : "")],
                ].map(([k,v],i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:i<6?`1px solid ${P.border}`:"none"}}>
                    <span style={{color:P.dim,fontSize:10}}>{k}</span>
                    <span style={{color:P.text,fontSize:10,fontWeight:500}}>{v}</span>
                  </div>
                ))}
              </div>

              {/* LG울트라PC 구매 */}
              <div style={{background:`linear-gradient(135deg, ${P.teal}10, ${P.blue}08)`,
                border:`1px solid ${P.teal}30`,borderRadius:12,padding:"14px 16px",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{fontSize:22}}>💻</span>
                  <div>
                    <div style={{color:P.teal,fontSize:12,fontWeight:700}}>멤버십 전용 LG 울트라PC 구매</div>
                    <div style={{color:P.dim,fontSize:9}}>해피허브메타 회원 전용 디바이스 (노드)</div>
                  </div>
                </div>
                <button onClick={()=>window.open("https://s.tosspayments.com/Bm7fEyX4fXI","_blank")}
                  style={{width:"100%",padding:"12px",borderRadius:10,border:"none",cursor:"pointer",
                    background:`linear-gradient(135deg, ${P.teal}, ${P.blue})`,
                    color:P.white,fontSize:13,fontWeight:700,display:"flex",alignItems:"center",
                    justifyContent:"center",gap:8,boxShadow:`0 4px 16px ${P.teal}30`,transition:"opacity .2s"}}
                  onMouseEnter={e=>e.currentTarget.style.opacity="0.9"}
                  onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                  <span style={{fontSize:16}}>🛒</span> LG 울트라PC 구매하기 (토스페이먼츠)
                </button>
                <div style={{color:P.dim,fontSize:8,marginTop:6,textAlign:"center",wordBreak:"break-all"}}>
                  🔗 https://s.tosspayments.com/Bm7fEyX4fXI
                </div>
              </div>

              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setRegStep(2);setError("")}} style={{flex:1,padding:10,borderRadius:10,background:"none",border:`1px solid ${P.border}`,color:P.muted,fontSize:12,cursor:"pointer"}}>← 이전</button>
                <button onClick={handleRegister} style={{flex:2,padding:10,borderRadius:10,border:"none",
                  background:`linear-gradient(135deg,${P.emerald},${P.teal})`,color:P.white,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  ✅ 회원 등록 완료
                </button>
              </div>
            </>)}

            {error && <div style={{color:P.red,fontSize:11,textAlign:"center",marginTop:10,background:`${P.red}10`,padding:8,borderRadius:8}}>⚠️ {error}</div>}
          </>)}
        </div>

        <div style={{textAlign:"center",marginTop:16}}>
          <div style={{color:P.dim,fontSize:9}}>🛡️ 사전 등록된 멤버십 회원 전용 · 📱 관리자 셋팅 LG태블릿 & 노트북 접근</div>
          <div style={{color:P.dim,fontSize:9,marginTop:4}}>© 2026 해피허브메타 · 커머스코 · 닥터엠디AI™</div>
        </div>
      </div>
    </div>
  );

  // ========== MAIN BMC ==========
  const tier = TIERS[currentMember?.tier] || TIERS.founder;

  const cells = [
    {id:"kp",title:"핵심 파트너",sub:"Key Partners",icon:"🤝",color:P.violet,area:"kp",
      items:[{l:"롯데홈쇼핑",d:"국내 TV/모바일 유통 60%",t:"국내"},{l:"K-가디언스",d:"Wholesale ID, 뉴욕 거점",t:"해외"},
        {l:"LG전자",d:"울트라태블릿 노드 HW",t:"HW"},{l:"토스",d:"K-브랜드페이 3초결제",t:"핀테크"},
        {l:"TOPS 2026",d:"정부 육성사업",t:"정부"},{l:"Anthropic",d:"닥터엠디AI™ 엔진",t:"AI"}]},
    {id:"ka",title:"핵심 활동",sub:"Key Activities",icon:"⚡",color:P.gold,area:"ka",
      items:[{l:"해피허브메타 플랫폼",d:"멤버십 생태계 허브 운영",t:"플랫폼"},{l:"LG태블릿 노드 관리",d:"1,000대 배포/지원",t:"인프라"},
        {l:"닥터엠디AI™ 진단",d:"6대지표 상품성 분석",t:"AI"},{l:"12주 스프린트",d:"진단→개선→스케일업",t:"육성"},
        {l:"Twin System 딜",d:"서울-뉴욕 화상 클로징",t:"세일즈"},{l:"11.11 Expo",d:"메가 세일즈",t:"이벤트"}]},
    {id:"kr",title:"핵심 자원",sub:"Key Resources",icon:"💎",color:P.teal,area:"kr",
      items:[{l:"해피허브메타 플랫폼",d:"멤버십 API 시스템",t:"플랫폼"},{l:"닥터엠디AI™",d:"특허출원 AI IP",t:"IP"},
        {l:"LG태블릿 1,000대",d:"멤버 전용 노드",t:"HW"},{l:"Wholesale ID",d:"92-2253224",t:"법적"},
        {l:"이만희 MD",d:"글로벌 딜 클로징",t:"인력"},{l:"플러싱 쇼룸",d:"NY 물류허브",t:"거점"}]},
    {id:"vp",title:"가치 제안",sub:"Value Props",icon:"🎯",color:P.rose,area:"vp",
      items:[{l:"1인 1억 실현",d:"1,000명×1억=1,000억",t:"비전"},{l:"LG태블릿 올인원",d:"AI진단/주문/정산 노드",t:"도구"},
        {l:"닥터엠디AI™",d:"자동진단→PMF확보",t:"AI"},{l:"듀얼채널",d:"롯데+K-가디언스",t:"채널"},
        {l:"리드타임 80%↓",d:"24h계약, Paperless",t:"효율"},{l:"홍익인간",d:"함께 꾸는 꿈은 이루어진다",t:"철학"}]},
    {id:"cr",title:"고객 관계",sub:"Customer Rel.",icon:"💬",color:P.emerald,area:"cr",
      items:[{l:"멤버십 커뮤니티",d:"1,000명 네트워크",t:"커뮤니티"},{l:"1:1 MD코칭",d:"주간 화상점검",t:"밀착"},
        {l:"AI 리포팅",d:"태블릿 KPI 대시보드",t:"데이터"},{l:"30/60/90일 리텐션",d:"자동 재주문",t:"CRM"}]},
    {id:"ch",title:"채널",sub:"Channels",icon:"📡",color:P.blue,area:"ch",
      items:[{l:"LG태블릿 (노드)",d:"멤버 올인원 접점",t:"핵심"},{l:"롯데홈쇼핑",d:"TV/모바일",t:"국내"},
        {l:"Twin System",d:"서울-뉴욕 화상",t:"글로벌"},{l:"플러싱 쇼룸",d:"오프라인 수주",t:"거점"},
        {l:"토스 K-브랜드페이",d:"3초결제",t:"결제"}]},
    {id:"cs",title:"고객 세그먼트",sub:"Customers",icon:"👥",color:P.indigo,area:"cs",
      items:[{l:"멤버십 1,000명",d:"LG태블릿 노드 보유",t:"핵심"},{l:"아시안 그로서리",d:"H-Mart 등",t:"바이어"},
        {l:"뷰티 리테일러",d:"K-Beauty Shops",t:"바이어"},{l:"온라인 도매상",d:"Amazon Sellers",t:"바이어"}]},
    {id:"cost",title:"비용 구조",sub:"Cost Structure",icon:"💸",color:P.red,area:"cost",
      items:[{l:"LG태블릿 (30%)",d:"노드 HW 도입",t:"인프라"},{l:"플랫폼 (25%)",d:"API,AI서버",t:"기술"},
        {l:"인력 (20%)",d:"MD,엔지니어",t:"인건"},{l:"마케팅 (15%)",d:"Expo,프로모션",t:"마케팅"},{l:"기타 (10%)",d:"물류,PG",t:"기타"}]},
    {id:"rev",title:"수익 흐름",sub:"Revenue",icon:"💰",color:P.amber,area:"rev",
      items:[{l:"플랫폼 수수료 5~10%",d:"거래액 커미션",t:"반복"},{l:"도매마진 15~30%",d:"미국 직거래",t:"거래"},
        {l:"AI 구독료",d:"닥터엠디AI™ 월구독",t:"구독"},{l:"서비스 피",d:"12주 스프린트",t:"프로젝트"},{l:"정부지원",d:"TOPS 바우처",t:"지원"}]},
  ];

  const tagC=(t)=>{const m={"국내":P.blue,"해외":P.violet,"HW":P.teal,"핀테크":P.emerald,"정부":P.gold,"AI":P.rose,"플랫폼":P.blue,"인프라":P.teal,"육성":P.emerald,"세일즈":P.gold,"이벤트":P.amber,"IP":P.rose,"법적":P.gold,"인력":P.teal,"거점":P.emerald,"비전":P.rose,"도구":P.blue,"채널":P.violet,"효율":P.gold,"철학":P.amber,"커뮤니티":P.emerald,"밀착":P.teal,"데이터":P.blue,"CRM":P.violet,"핵심":P.rose,"글로벌":P.violet,"결제":P.emerald,"바이어":P.blue,"기술":P.blue,"인건":P.violet,"마케팅":P.gold,"기타":P.dim,"반복":P.emerald,"거래":P.blue,"구독":P.violet,"프로젝트":P.gold,"지원":P.teal};return m[t]||P.dim};

  const Detail=({c})=>(
    <div style={{padding:16,animation:"fi .3s ease"}}>
      <button onClick={()=>{setActiveCell(null);setView("canvas")}} style={{background:"none",border:`1px solid ${P.border}`,color:P.muted,padding:"6px 14px",borderRadius:8,cursor:"pointer",marginBottom:14,fontSize:12}}>← 캔버스</button>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <span style={{fontSize:26}}>{c.icon}</span>
        <div><h2 style={{color:c.color,margin:0,fontSize:18}}>{c.title}</h2><span style={{color:P.dim,fontSize:11}}>{c.sub}</span></div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {c.items.map((it,i)=>(
          <div key={i} style={{background:P.card,borderRadius:10,padding:"12px 16px",borderLeft:`3px solid ${c.color}`,transition:"all .2s"}}
            onMouseEnter={e=>{e.currentTarget.style.background=P.cardAlt;e.currentTarget.style.transform="translateX(3px)"}}
            onMouseLeave={e=>{e.currentTarget.style.background=P.card;e.currentTarget.style.transform="none"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div style={{color:P.text,fontWeight:600,fontSize:13,marginBottom:2}}>{it.l}</div>
                <div style={{color:P.muted,fontSize:11}}>{it.d}</div></div>
              <span style={{background:`${tagC(it.t)}20`,color:tagC(it.t),padding:"2px 8px",borderRadius:10,fontSize:9,fontWeight:600}}>{it.t}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const Cell=({c})=>(
    <div onClick={()=>{setActiveCell(c);setView("detail")}} style={{gridArea:c.area,background:P.card,borderRadius:12,padding:"10px 12px",cursor:"pointer",position:"relative",overflow:"hidden",border:`1px solid ${P.border}`,transition:"all .25s",display:"flex",flexDirection:"column"}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=c.color;e.currentTarget.style.transform="translateY(-2px)"}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=P.border;e.currentTarget.style.transform="none"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${c.color},${c.color}33)`}}/>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
        <span style={{fontSize:14}}>{c.icon}</span>
        <div><div style={{color:c.color,fontWeight:700,fontSize:11}}>{c.title}</div><div style={{color:P.dim,fontSize:8}}>{c.sub}</div></div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:3}}>
        {c.items.slice(0,4).map((it,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:9}}>
          <div style={{width:3,height:3,borderRadius:"50%",background:c.color,flexShrink:0}}/><span style={{color:P.text}}>{it.l}</span></div>))}
        {c.items.length>4&&<div style={{color:P.dim,fontSize:8}}>+{c.items.length-4} →</div>}
      </div>
    </div>
  );

  const kpis=[{v:"1,000",l:"멤버 노드",c:P.blue},{v:"1억",l:"멤버당 수익",c:P.emerald},{v:"1,000억",l:"생태계 비전",c:P.rose},
    {v:"300+",l:"활성 바이어",c:P.violet},{v:"25%",l:"전환율",c:P.gold},{v:"50%+",l:"재주문율",c:P.teal}];

  const tierCounts = Object.keys(TIERS).reduce((a,k)=>({...a,[k]:members.filter(m=>m.tier===k).length}),{});

  return (
    <div style={{fontFamily:"'Noto Sans KR',sans-serif",background:P.bg,color:P.text,minHeight:"100vh",padding:14,maxWidth:1200,margin:"0 auto"}}>
      <style>{css}</style>

      {/* Top Bar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,padding:"8px 12px",background:P.card,borderRadius:10,border:`1px solid ${P.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:30,height:30,borderRadius:8,background:`linear-gradient(135deg,${tier.color}80,${tier.color})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{tier.icon}</div>
          <div>
            <div style={{color:P.text,fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
              {currentMember?.name}
              <span style={{background:`${tier.color}20`,color:tier.color,padding:"1px 6px",borderRadius:4,fontSize:8,fontWeight:700}}>{tier.badge}</span>
            </div>
            <div style={{color:P.dim,fontSize:9}}>{currentMember?.id} · {tier.label}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <button onClick={()=>setShowAdmin(!showAdmin)} style={{background:`${P.blue}10`,border:`1px solid ${P.blue}25`,color:P.blue,padding:"4px 8px",borderRadius:6,cursor:"pointer",fontSize:9}}>
            ⚙️ 회원관리 ({members.length})
          </button>
          <button onClick={handleLogout} style={{background:`${P.red}10`,border:`1px solid ${P.red}25`,color:P.red,padding:"4px 8px",borderRadius:6,cursor:"pointer",fontSize:9}}>로그아웃</button>
        </div>
      </div>

      {/* Admin */}
      {showAdmin&&(
        <div style={{background:P.card,borderRadius:12,padding:14,marginBottom:10,border:`1px solid ${P.border}`,animation:"fi .3s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{color:P.text,fontSize:13,fontWeight:700}}>👥 멤버십 현황</div>
            <button onClick={()=>setShowAdmin(false)} style={{background:"none",border:"none",color:P.dim,cursor:"pointer",fontSize:14}}>×</button>
          </div>
          {/* Tier Summary */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:10}}>
            {Object.entries(TIERS).map(([k,v])=>(
              <div key={k} style={{background:P.bg,borderRadius:8,padding:8,textAlign:"center",border:`1px solid ${v.color}20`}}>
                <span style={{fontSize:16}}>{v.icon}</span>
                <div style={{color:v.color,fontSize:16,fontWeight:800}}>{tierCounts[k]||0}</div>
                <div style={{color:P.dim,fontSize:8}}>{v.label}</div>
              </div>
            ))}
          </div>
          {/* Member List */}
          <div style={{maxHeight:180,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
            {members.length===0?<div style={{color:P.dim,fontSize:11,textAlign:"center",padding:16}}>등록된 회원이 없습니다</div>:
            members.map((m,i)=>{const t=TIERS[m.tier];return(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:P.bg,borderRadius:8,padding:"6px 10px",border:`1px solid ${m.id===currentMember?.id?P.emerald+"40":P.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:12}}>{t.icon}</span>
                  <div>
                    <div style={{color:P.text,fontSize:10,fontWeight:600}}>{m.name} <span style={{color:t.color,fontSize:8}}>({m.id})</span>
                      {m.id===currentMember?.id&&<span style={{color:P.emerald,fontSize:8,marginLeft:4}}>● 나</span>}</div>
                    <div style={{color:P.dim,fontSize:8}}>{m.phone} · {m.email}</div>
                  </div>
                </div>
                {m.id!==currentMember?.id&&(
                  <button onClick={()=>removeMember(m.id)} style={{background:`${P.red}10`,border:`1px solid ${P.red}25`,color:P.red,padding:"2px 6px",borderRadius:4,cursor:"pointer",fontSize:8}}>삭제</button>
                )}
              </div>
            )})}
          </div>
        </div>
      )}

      {/* Philosophy */}
      {showPhilosophy&&view==="canvas"&&(
        <div style={{background:`linear-gradient(135deg,${P.rose}06,${P.amber}04)`,border:`1px solid ${P.rose}15`,borderRadius:12,padding:"14px 18px",marginBottom:10,position:"relative"}}>
          <button onClick={()=>setShowPhilosophy(false)} style={{position:"absolute",top:8,right:10,background:"none",border:"none",color:P.dim,cursor:"pointer",fontSize:14}}>×</button>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:9,color:P.amber,fontWeight:600,letterSpacing:3,marginBottom:4}}>弘益人間 · VISION 2026</div>
            <div style={{fontSize:16,fontWeight:900,background:`linear-gradient(135deg,${P.amber},${P.rose})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>혼자 꾸는 꿈은 견몽, 함께 꾸는 꿈은 반드시 이루어진다</div>
            <div style={{color:P.muted,fontSize:10,marginTop:4}}>1,000명 × 1억 = <span style={{color:P.rose,fontWeight:700}}>1,000억</span> 멤버십 생태계</div>
          </div>
        </div>
      )}

      <div style={{textAlign:"center",marginBottom:10}}>
        <h1 style={{fontSize:18,fontWeight:900,margin:"0 0 2px",background:`linear-gradient(135deg,${P.blue},${P.violet},${P.rose})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>비즈니스 모델 캔버스 2026</h1>
        <p style={{color:P.muted,fontSize:10,margin:0}}>해피허브메타 멤버십 · LG태블릿 노드 · 닥터엠디AI™</p>
      </div>

      {view==="detail"&&activeCell?<Detail c={activeCell}/>:(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6,marginBottom:8}}>
            {kpis.map((k,i)=>(<div key={i} style={{background:P.card,borderRadius:10,padding:"8px 4px",textAlign:"center",border:`1px solid ${P.border}`}}>
              <div style={{color:k.c,fontSize:15,fontWeight:800}}>{k.v}</div>
              <div style={{color:P.muted,fontSize:8}}>{k.l}</div></div>))}
          </div>

          <div style={{background:`${P.blue}06`,border:`1px solid ${P.border}`,borderRadius:10,padding:8,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:3,flexWrap:"wrap",fontSize:9,color:P.muted}}>
              {["👤 멤버","→","📱 LG태블릿","→","🔗 API","→","🏠 허브","→","🤖 AI","→","🌏 듀얼채널","→","💰 1,000억"].map((s,i)=>(
                <span key={i} style={{color:s==="→"?P.dim:P.text,fontWeight:s==="→"?700:500}}>{s}</span>
              ))}
            </div>
          </div>

          <div style={{display:"grid",gap:6,gridTemplateColumns:"repeat(10,1fr)",gridTemplateRows:"auto auto auto",
            gridTemplateAreas:`"kp kp ka ka vp vp cr cr cs cs" "kp kp kr kr vp vp ch ch cs cs" "cost cost cost cost cost rev rev rev rev rev"`}}>
            {cells.map(c=><Cell key={c.id} c={c}/>)}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
            <div style={{background:`${P.blue}06`,border:`1px solid ${P.blue}18`,borderRadius:10,padding:10}}>
              <span>🇰🇷</span><span style={{color:P.blue,fontWeight:700,fontSize:11,marginLeft:4}}>국내 TOPS</span>
              <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:6}}>
                {["롯데홈쇼핑","닥터엠디AI™","LG사이니지","스프린트"].map((t,i)=>(<span key={i} style={{background:`${P.blue}10`,color:P.blue,padding:"1px 6px",borderRadius:5,fontSize:8}}>{t}</span>))}
              </div>
            </div>
            <div style={{background:`${P.violet}06`,border:`1px solid ${P.violet}18`,borderRadius:10,padding:10}}>
              <span>🇺🇸</span><span style={{color:P.violet,fontWeight:700,fontSize:11,marginLeft:4}}>K-Brand Highway</span>
              <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:6}}>
                {["K-가디언스","Twin System","11.11 Expo","토스결제"].map((t,i)=>(<span key={i} style={{background:`${P.violet}10`,color:P.violet,padding:"1px 6px",borderRadius:5,fontSize:8}}>{t}</span>))}
              </div>
            </div>
          </div>

          <div style={{background:`${P.amber}05`,border:`1px solid ${P.amber}15`,borderRadius:10,padding:12,marginTop:8,textAlign:"center"}}>
            <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:8}}>
              <span style={{color:P.blue,fontWeight:800,fontSize:13}}>1,000노드</span>
              <span style={{color:P.amber,fontWeight:700}}>×</span>
              <span style={{color:P.emerald,fontWeight:800,fontSize:13}}>1억</span>
              <span style={{color:P.amber,fontWeight:700}}>=</span>
              <span style={{color:P.rose,fontWeight:900,fontSize:16}}>1,000억</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
