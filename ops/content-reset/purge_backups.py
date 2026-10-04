"""One-time owner-authorized erasure of pre-reset Medical OS backup copies."""
import os,re,sys,subprocess
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'r2-backups'))
from storage_guard import inventory
CUTOFF='20261003T231839Z'
PATTERN=re.compile(r'^supabase/(\d{4}/\d{2}/\d{2})/(\d{8}T\d{6}Z)/backup\.tar\.gz(?:\.sha256)?$')
def select_keys(objects):
 keys=[];seen=set()
 for obj in objects:
  key=obj['Key']
  if key in seen:raise ValueError('Duplicate object key')
  seen.add(key)
  match=PATTERN.fullmatch(key)
  if key.startswith('supabase/') and not match:raise ValueError('Unknown backup object; reinventory required')
  if match:
   if match[1].replace('/','')!=match[2][:8]:raise ValueError('Backup date mismatch')
   if match[2]<=CUTOFF:keys.append(key)
 return sorted(keys)
def main():
 if os.environ.get('CONTENT_RESET_ID')!='permanent-2026-10-04':raise ValueError('Reset identity required')
 keys=select_keys(inventory())
 for key in keys:
  subprocess.run(['aws','s3api','delete-object','--bucket',os.environ['R2_BUCKET'],'--key',key,'--endpoint-url',os.environ['R2_ENDPOINT']],check=True,capture_output=True,timeout=60)
 remaining=select_keys(inventory())
 if remaining:raise ValueError('Pre-reset backup copies remain')
 print('Pre-reset backup objects erased:',len(keys),'; remaining:',len(remaining))
if __name__=='__main__':main()
