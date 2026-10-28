import sys,json,urllib.request,urllib.error
from pathlib import Path
base=sys.argv[1].rstrip('/')
rows=[]
def check(method,path,body,expected):
 data=(body.encode() if isinstance(body,str) else json.dumps(body).encode()) if body is not None else None
 req=urllib.request.Request(base+path,data=data,method=method,headers={'Content-Type':'application/json','Origin':'http://localhost:8082'})
 try:r=urllib.request.urlopen(req,timeout=30)
 except urllib.error.HTTPError as e:r=e
 value=json.load(r)
 assert r.status==expected,(method,path,r.status,value)
 assert r.headers.get('Access-Control-Allow-Origin') in ('*','http://localhost:8082')
 rows.append({'method':method,'path':path,'body':body,'status':r.status,'response':value})
 return value
full={'name':'Garden Test','capacity':2500,'status':'OPEN'}
original=check('GET','/zones',None,200)
assert len(original)==4
check('GET','/zones/ZONE-07',None,200)
for m in ['GET','PUT','PATCH','DELETE']:check(m,'/zones/UNKNOWN',full if m in ['PUT','PATCH'] else None,404)
assert check('POST','/zones',full,201)['id']=='ZONE-NEW'
assert check('PUT','/zones/ZONE-07',full,200)['operation']=='REPLACED'
check('PUT','/zones/ZONE-07',{'status':'FULL'},400)
for status in ['OPEN','FULL','CLOSED']:
 assert check('PATCH','/zones/ZONE-07',{'status':status},200)['changes']['status']==status
for bad in ['{','null',[],{}, {**full,'name':' '}, {**full,'capacity':0}, {**full,'capacity':-1}, {**full,'capacity':1.5}, {**full,'capacity':'2500'}, {**full,'status':'PAUSED'}, {**full,'id':'forced'}]:
 check('POST','/zones',bad,400)
for bad in [{},{'status':'PAUSED'},{'status':'OPEN','name':'X'},'null','{']:check('PATCH','/zones/ZONE-07',bad,400)
assert check('DELETE','/zones/ZONE-07',None,200)['operation']=='DELETED'
assert check('GET','/zones',None,200)==original
req=urllib.request.Request(base+'/zones/ZONE-07',method='OPTIONS',headers={'Origin':'http://localhost:8082','Access-Control-Request-Method':'PATCH','Access-Control-Request-Headers':'content-type'})
with urllib.request.urlopen(req) as r:assert r.status in [200,204]
p=Path(__file__).resolve().parents[1]/'evidencias'/('cloud-api.json' if base.startswith('https') else 'local-api.json')
p.write_text(json.dumps({'base':base,'checks':rows,'corsPreflight':'OK'},ensure_ascii=False,indent=2)+'\n')
print(len(rows),'pruebas HTTP + CORS correctas. Evidencias:',p.name)
