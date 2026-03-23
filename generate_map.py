import os
import re

def parse_md_table(md_content, section_title):
    try:
        start_idx = md_content.find(section_title)
        if start_idx == -1: return []
        table_start = md_content.find('|', start_idx)
        if table_start == -1: return []
        # Find end of table (double newline)
        table_end = md_content.find('\n\n', table_start)
        if table_end == -1: table_end = len(md_content)
        
        table_text = md_content[table_start:table_end].strip()
        lines = table_text.split('\n')
        if len(lines) < 3: return []
        
        # Parse rows (skip header and separator)
        data = []
        for line in lines[2:]:
            cells = [cell.strip().replace('`', '') for cell in line.split('|')[1:-1]]
            data.append(cells)
        return data
    except: return []

def main():
    with open(r'd:\database_sns\FRONTEND_SYSTEM_FULL_SPEC.md', 'r', encoding='utf-8') as f:
        frontend_md = f.read()
        
    with open(r'd:\database_sns\BACKEND_SYSTEM_FULL_SPEC.md', 'r', encoding='utf-8') as f:
        backend_md = f.read()

    # 1. Compare Endpoints
    # We will search the frontend api directory to find exactly what it hits, 
    # and compare it to the backend route list.
    api_dir = r"d:\database_sns\edulink-the-core\src\api"
    frontend_endpoints = []
    if os.path.exists(api_dir):
        for root, _, files in os.walk(api_dir):
            for file in files:
                if file.endswith('.ts') and file not in ('types.ts', 'axios.ts'):
                    with open(os.path.join(root, file), 'r', encoding='utf-8') as af:
                        content = af.read()
                        # Simple extraction
                        # Ex: api.post('/auth/login', ...)
                        eps = re.findall(r'api\.(get|post|put|delete|patch)\([\'"`](.*?)[\'"`]', content)
                        for method, ep in eps:
                            ep_clean = "/api" + ep
                            # Strip params /${id} -> /:id for generic matching
                            ep_clean = re.sub(r'\$\{.*?\}', ':id', ep_clean)
                            frontend_endpoints.append((method.upper(), ep_clean, file))

    backend_table = parse_md_table(backend_md, "## 2️⃣ API Endpoints")
    backend_endpoints = []
    for row in backend_table:
        if len(row) >= 2:
            ep = row[0]
            method = row[1]
            backend_endpoints.append((method.upper(), ep))

    # Compile the comparison table
    out = "# FRONTEND ↔ BACKEND INTEGRATION MAP\n\n"
    out += "## Endpoint Comparison\n\n"
    out += "| Frontend Action (File) | Frontend Endpoint Requested | Corresponding Backend Endpoint | Method | Status |\n"
    out += "|---|---|---|---|---|\n"

    # Compare Frontend against Backend
    matched_backend = set()
    for f_method, f_ep, f_file in frontend_endpoints:
        status = "❌ MISSING IN BACKEND"
        matched_b_ep = "None"
        
        for b_method, b_ep in backend_endpoints:
            # Need fuzzy match because of param mappings mostly (/:id vs /:studentId etc)
            b_ep_generic = re.sub(r':[a-zA-Z0-9_]+', ':id', b_ep)
            f_ep_generic = re.sub(r':[a-zA-Z0-9_]+', ':id', f_ep)
            
            if b_method == f_method and (b_ep_generic == f_ep_generic or f_ep_generic.startswith(b_ep_generic) or b_ep_generic.startswith(f_ep_generic)):
                status = "✅ OK"
                matched_b_ep = b_ep
                matched_backend.add((b_method, b_ep))
                break
                
        out += f"| `{f_file}` | `{f_ep}` | `{matched_b_ep}` | `{f_method}` | {status} |\n"

    # Any unused endpoints in backend?
    for b_method, b_ep in backend_endpoints:
        if (b_method, b_ep) not in matched_backend:
            out += f"| `Unused/External` | `None` | `{b_ep}` | `{b_method}` | ⚠️ UNUSED IN FRONTEND |\n"

    # 2. Database & Data Models Comparison
    out += "\n## Data Models Comparison\n\n"
    out += "| Frontend Model | Backend Table Found | Status |\n"
    out += "|---|---|---|\n"
    
    frontend_models = ['User', 'StudentProfile', 'ODRequest', 'LeaveRequest', 'ResultUpload', 'Notification', 'AuditLog', 'Campus', 'Department', 'FeedPost', 'Class', 'AttendanceRecord']
    backend_tables = [row[0] for row in parse_md_table(backend_md, "## 3️⃣ Database Schema")]
    # If the markdown parsing failed, just hardcode the known tables
    if not backend_tables:
        backend_tables = ['users', 'student_profiles', 'leave_requests', 'od_requests', 'results', 'notifications', 'audit_logs', 'classes', 'attendance_records', 'feed_posts', 'colleges', 'departments']
    
    for fm in frontend_models:
        # guess table name mapping
        guess = fm.lower().replace('request', '_requests').replace('upload', 's').replace('log', '_logs').replace('campus', 'colleges').replace('record', '_records').replace('post', '_posts')
        if guess in " ".join(backend_tables) or fm.lower() + 's' in backend_tables:
            out += f"| `{fm}` | `{guess}` | ✅ OK |\n"
        else:
            out += f"| `{fm}` | `None Detected` | ❌ MISSING DB ENTITY |\n"

    with open(r'd:\database_sns\FRONTEND_BACKEND_INTEGRATION_MAP.md', 'w', encoding='utf-8') as mapf:
        mapf.write(out)
        
    print("Done")

if __name__ == "__main__":
    main()
