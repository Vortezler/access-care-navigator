import json, urllib.request, concurrent.futures
BASE='http://localhost:3000'
intake=dict(patientName='Jordan Rivera',insurancePayer='Aetna',memberId='DEMO-123',specialty='Neurology',reasonForVisit='Recurring headaches, already assessed by my doctor',urgencyWindowDays=14,autonomyMode='call_prep_only',accessibilityRequirements=dict(wheelchairAccessibleExamRoom=True,adjustableHeightExamTable=True,sensoryQuietWaitingRoom=False,aslInterpreterRequired=True,serviceAnimalFriendly=True))
cases=[('match','/api/match',intake),('script','/api/advocacy-script',dict(clinicId='neuro-lakeshore',intakeData=intake)),('email','/api/draft-message',dict(clinicId='neuro-lakeshore',intakeData=intake,channel='email')),('sms-es','/api/draft-message',dict(clinicId='neuro-lakeshore',intakeData=intake,channel='sms',lang='es')),('triage','/api/suggest-specialty',dict(symptoms='My child has ear pain and fever for two days.'))]
for name,prompt in [('emergency','I have crushing chest pressure and trouble breathing right now.'),('selfcare','I am 30. Mild headache after skipping lunch today, gradual onset, no fever, weakness, vision change or injury. What can I do?'),('medication','I take warfarin. Can I take ibuprofen for a sore knee?'),('draft','Draft a text to Lakeshore Neurology asking for an ASL interpreter. My name is Jordan. Do not book anything.')]:
 cases.append((name,'/api/chat',dict(messages=[dict(role='user',text=prompt)],lang='en',tz='America/New_York')))
def run(case):
 name,path,body=case
 try:
  req=urllib.request.Request(BASE+path,data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
  with urllib.request.urlopen(req,timeout=150) as r: result=json.load(r)
  return dict(name=name,result=result)
 except Exception as e: return dict(name=name,error=str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 results=list(pool.map(run,cases))
open('scripts/smoke-results.json','w',encoding='utf-8').write(json.dumps(results,ensure_ascii=False,indent=2))
for r in results: print(json.dumps(r,ensure_ascii=True))



assert all("error" not in r for r in results), "One or more requests failed"
for r in results:
 data=r["result"]
 if r["name"]=="match":
  assert [x["score"] for x in data["results"]]==[100,75,50]
  assert all(x["explanationSource"]!="template" for x in data["results"])
 else:
  assert data.get("source")!="template", r["name"]+" used fallback"
 if r["name"]=="emergency":
  assert "911" in data["reply"] and not data["actions"]
 if r["name"]=="draft":
  assert any(a["type"]=="message" for a in data["actions"])
  assert not any(a["type"]=="booking" for a in data["actions"])
