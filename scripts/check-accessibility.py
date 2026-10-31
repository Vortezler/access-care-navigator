import json,urllib.request
for text in ['I have a disability and appointments are hard for me. Can you help me figure out what support I need?', 'Please add large print, a support person and longer appointments to my accessibility needs. I want to review them first.']:
 req=urllib.request.Request('http://localhost:3000/api/chat',data=json.dumps({'messages':[{'role':'user','text':text}],'lang':'en'}).encode(),headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=100) as r: result=json.load(r)
 print(json.dumps(result))
 assert result['source']!='template'
 if 'Please add' in text:
  cards=[a for a in result['actions'] if a['type']=='accessibility']
  assert cards and set(cards[0]['needs'])=={'largePrintBraille','supportPersonWelcome','extendedAppointments'}
  assert all(a['type']=='accessibility' for a in result['actions'])
 else: assert '?' in result['reply']
