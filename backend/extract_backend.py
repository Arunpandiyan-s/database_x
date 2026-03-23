import os
import re

def main():
    backend_dir = r"d:\database_sns\backend"
    folders = ['routes', 'controllers', 'services', 'repositories', 'models', 'middleware', 'utils', 'config', 'workers']
    
    out = "# BACKEND SYSTEM FULL SPEC\n\n"
    
    # 1. Structure
    out += "## 1️⃣ Backend Structure\n\n```\nbackend/\n"
    for f in folders:
        if os.path.isdir(os.path.join(backend_dir, f)):
            out += f" ├── {f}/\n"
            for fn in sorted(os.listdir(os.path.join(backend_dir, f))):
                if fn.endswith('.js') or fn.endswith('.sql'):
                    out += f" │   ├── {fn}\n"
    out += "```\n\n"
    
    # 2. API Endpoints
    out += "## 2️⃣ API Endpoints\n\n"
    out += "| Endpoint | Method | Controller | Payload / Access | Response |\n|---|---|---|---|---|\n"
    routes_dir = os.path.join(backend_dir, 'routes')
    if os.path.exists(routes_dir):
        for route_file in sorted(os.listdir(routes_dir)):
            if not route_file.endswith('.js'): continue
            r_path = os.path.join(routes_dir, route_file)
            prefix = "/" + route_file.replace('.routes.js', '')
            try:
                with open(r_path, 'r', encoding='utf-8') as rf:
                    content = rf.read()
                    lines = content.split('\n')
                    for line in lines:
                        # naive router match
                        m = re.search(r'router\.(get|post|put|delete|patch)\([\'"`](.*?)[\'"`],\s*(.*?)\)', line)
                        if m:
                            method = m.group(1).upper()
                            path = m.group(2)
                            handlers = m.group(3)
                            # cleanup path
                            ep = (prefix + path).replace('//', '/')
                            # clean handlers
                            out += f"| `{method}` | `{ep}` | `{handlers[:30]}...` | Required | Standard JSON |\n"
            except Exception as e:
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
                    # find tables
                    tbl_matches = re.finditer(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);', sql_content, re.IGNORECASE)
                    for tm in tbl_matches:
                        t_name = tm.group(1)
                        t_body = tm.group(2)
                        # Extract fields
                        fields = []
                        for bl in t_body.split('\n'):
                            bl = bl.strip()
                            if not bl or bl.upper().startswith(('PRIMARY', 'FOREIGN', 'UNIQUE', 'CONSTRAINT')):
                                continue
                            parts = bl.split(' ')
                            if len(parts) >= 2:
                                fields.append((parts[0], parts[1]))
                        tables[t_name] = fields
            except Exception as e:
                pass
                
    for t_name, t_fields in tables.items():
        out += f"### `{t_name}`\n"
        out += "| Field | Type |\n|---|---|\n"
        for fn, ft in t_fields:
            if not fn.startswith('--') and not fn.startswith(')'):
                ft_clean = ft.replace(',', '')
                out += f"| `{fn}` | `{ft_clean}` |\n"
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
                        for f_name in funcs:
                            out += f"- `{f_name}` middleware\n"
                except:
                    pass
                out += "\n"

    # 5. Event System
    out += "## 5️⃣ Event System\n\n"
    out += "Found emitted events:\n"
    events = set()
    for root, dirs, files in os.walk(backend_dir):
        if 'node_modules' in root: continue
        for f in files:
            if f.endswith('.js'):
                try:
                    with open(os.path.join(root, f), 'r', encoding='utf-8') as f_obj:
                        c = f_obj.read()
                        emits = re.findall(r'emit\([\'"`]([A-Z0-9_]+)[\'"`]', c)
                        event_args = re.findall(r'(?:type|event)[:=]\s*[\'"`]([A-Z0-9_]+)[\'"`]', c)
                        for e in emits: events.add(e)
                        for ea in event_args:
                            if '_' in ea and ea.isupper():
                                events.add(ea)
                except:
                    pass
    
    for ev in sorted(list(events)):
        # Very simple validation that it's an event format string
        if len(ev) > 5 and '_' in ev and ev.isupper():
            out += f"[*] `{ev}`\n"
            
    with open(r"d:\database_sns\BACKEND_SYSTEM_FULL_SPEC.md", "w", encoding='utf-8') as out_file:
        out_file.write(out)

if __name__ == "__main__":
    main()
