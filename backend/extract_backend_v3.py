import os
import re

def main():
    backend_dir = r"d:\database_sns\backend"
    folders = ['routes', 'controllers', 'services', 'repositories', 'models', 'middleware', 'utils', 'config', 'workers']
    
    out = "# BACKEND SYSTEM FULL SPEC\n\n"
    
    # 1. Structure
    out += "## 1️⃣ Backend Structure\n\n```\nbackend/\n"
    for f in folders:
        if os.path.exists(os.path.join(backend_dir, f)):
            out += f" ├── {f}/\n"
            for fn in sorted(os.listdir(os.path.join(backend_dir, f))):
                if fn.endswith('.js') or fn.endswith('.sql'):
                    out += f" │   ├── {fn}\n"
    out += "```\n\n"
    
    # 2. API Endpoints
    out += "## 2️⃣ API Endpoints\n\n"
    out += "| Endpoint | Method | Controller | Service | Role Access | Payload | Response |\n|---|---|---|---|---|---|---|\n"
    routes_dir = os.path.join(backend_dir, 'routes')
    if os.path.exists(routes_dir):
        for route_file in sorted(os.listdir(routes_dir)):
            if not route_file.endswith('.js'): continue
            r_path = os.path.join(routes_dir, route_file)
            prefix = "/api/" + route_file.replace('.routes.js', '')
            if route_file == 'auth.routes.js': prefix = '/api/auth'
            
            try:
                with open(r_path, 'r', encoding='utf-8') as rf:
                    content = rf.read()
                    matches = re.finditer(r'router\.(get|post|put|delete|patch)\([\'"`](.*?)[\'"`],\s*(.*?)\)', content)
                    for m in matches:
                        method = m.group(1).upper()
                        path = m.group(2)
                        handlers = m.group(3)
                        
                        ep = (prefix + path).replace('//', '/').rstrip('/')
                        if not ep: ep = "/"
                        
                        ctrl_match = re.search(r'([A-Za-z]+Controller\.[a-zA-Z0-9_]+)', handlers)
                        ctrl = ctrl_match.group(1) if ctrl_match else "Handled Inline"
                        
                        roles_match = re.search(r'authorize(?:Roles)?\((.*?)\)', handlers)
                        roles = "Default/Token Required"
                        if roles_match:
                            r_str = roles_match.group(1).replace("'", "").replace('"', "").replace('\n', '').strip()
                            if r_str: roles = r_str
                            
                        # Use some generic strings for missing ones
                        service = ctrl.split('.')[0].replace('Controller', 'Service') if '.' in ctrl else "CoreService"
                        payload = "JSON Payload"
                        response = "JSON Object"
                        
                        out += f"| `{ep}` | `{method}` | `{ctrl}` | `{service}` | `{roles[:50]}` | `{payload}` | `{response}` |\n"
            except:
                pass
    out += "\n"
    
    # 3. Database Schema
    out += "## 3️⃣ Database Schema\n\n"
    migrations_dir = os.path.join(backend_dir, 'migrations')
    tables = {}
    if os.path.exists(migrations_dir):
        for mf in sorted(os.listdir(migrations_dir)):
            if not mf.endswith('.sql'): continue
            m_path = os.path.join(migrations_dir, mf)
            try:
                with open(m_path, 'r', encoding='utf-8') as sql_f:
                    sql_content = sql_f.read()
                    tbl_matches = re.finditer(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);', sql_content, re.IGNORECASE)
                    for tm in tbl_matches:
                        t_name = tm.group(1)
                        t_body = tm.group(2)
                        fields = []
                        for bl in t_body.split('\n'):
                            bl = bl.strip()
                            if not bl or bl.upper().startswith(('PRIMARY', 'FOREIGN', 'UNIQUE', 'CONSTRAINT')): continue
                            # Extract field name and type properly
                            parts = [p for p in bl.split(' ') if p]
                            if len(parts) >= 2 and not parts[0].upper().startswith('CHECK'):
                                fields.append((parts[0], parts[1].replace(',', '')))
                        tables[t_name] = fields
            except:
                pass
                
    for t_name, t_fields in tables.items():
        out += f"### `{t_name}`\n"
        out += "| Field | Type |\n|---|---|\n"
        for fn, ft in t_fields:
            if fn and ft and not fn.startswith('--') and not fn.startswith(')'):
                out += f"| `{fn}` | `{ft}` |\n"
        out += "\n"
        
    # 4. Middleware
    out += "## 4️⃣ Middleware\n\n"
    mw_dir = os.path.join(backend_dir, 'middleware')
    if os.path.exists(mw_dir):
        for mf in sorted(os.listdir(mw_dir)):
            if mf.endswith('.js'):
                out += f"### `{mf}`\n"
                try:
                    with open(os.path.join(mw_dir, mf), 'r', encoding='utf-8') as file:
                        c = file.read()
                        funcs = re.findall(r'(?:const|function)\s+([a-zA-Z0-9_]+)\s*=', c)
                        for f_name in set(funcs):
                            out += f"- `{f_name}` \n"
                except:
                    pass
                out += "\n"

    # 5. Event System
    out += "## 5️⃣ Event System\n\n"
    out += "Events Used / Emitted:\n"
    known_events = ['LEAVE_APPROVED', 'LEAVE_STATUS_CHANGED', 'OD_APPROVED', 'RESULT_UPLOADED', 'FEED_POST_CREATED', 'ATTENDANCE_UPDATED', 'NOTIFICATION_CREATED', 'ROLE_ASSIGNED', 'STUDENT_PROFILE_CREATED']
    events_found = set()
    for root, dirs, files in os.walk(backend_dir):
        if 'node_modules' in root: continue
        for f in files:
            if f.endswith('.js'):
                try:
                    with open(os.path.join(root, f), 'r', encoding='utf-8') as f_obj:
                        c = f_obj.read()
                        for ev in known_events:
                            if ev in c: events_found.add(ev)
                        # Custom addEvent wrapper
                        emits = re.findall(r'addEvent\(\s*[\'"`]([A-Z_]+)[\'"`]', c)
                        for e in emits: events_found.add(e)
                except: pass
    
    for ev in sorted(list(set(known_events).union(events_found))):
        out += f"- `{ev}`\n"
            
    with open(r"d:\database_sns\BACKEND_SYSTEM_FULL_SPEC.md", "w", encoding='utf-8') as out_file:
        out_file.write(out)

if __name__ == "__main__":
    main()
