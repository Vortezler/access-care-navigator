import urllib.request,urllib.error
for path in ['/','/results','/guide']:
 with urllib.request.urlopen('http://localhost:3000'+path) as r: print(path,r.status)
for path in ['chat','draft-message','advocacy-script','suggest-specialty','match']:
 try:
  urllib.request.urlopen(urllib.request.Request('http://localhost:3000/api/'+path,data=b'null',headers={'Content-Type':'application/json'}))
  raise AssertionError(path+' accepted null')
 except urllib.error.HTTPError as e:
  assert e.code==400,(path,e.code)
  print(path,'null body rejected: 400')
