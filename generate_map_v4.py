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
    api_dir = r"d:\database_sns\edulink-the-core\src\api"
    frontend_endpoints = []
    if os.path.exists(api_dir):
        for root, _, files in os.walk(api_dir):
            for file in files:
                if file.endswith('.ts') and file not in ('types.ts', 'axios.ts'):
                    with open(os.path.join(root, file), 'r', encoding='utf-8') as af:
                        content = af.read()
                        
                        eps = re.findall(r'api\.(get|post|put|delete|patch)\([\'"`](.*?)[\'"`]', content)
                        for method, ep in eps:
                            ep_clean = ep.strip()
                            if ep_clean.startswith('/admin'):
                                ep_clean = "/api" + ep_clean
                            elif not ep_clean.startswith('/api/'):
                                ep_clean = "/api" + ep_clean
                            
                            m_clean = re.sub(r'\$\{.*?\}', ':id', ep_clean)
                            frontend_endpoints.append((method.upper(), m_clean, file))

    backend_table = parse_md_table(backend_md, "## 2️⃣ API Endpoints")
    backend_endpoints = []
    for row in backend_table:
        if len(row) >= 2:
            ep = row[0]
            method = row[1]
            backend_endpoints.append((method.upper(), ep))

    out = "# FRONTEND ↔ BACKEND INTEGRATION MAP\n\n"
    out += "## Endpoint Comparison\n\n"
    out += "| Frontend Action (File) | Frontend Endpoint Requested | Corresponding Backend Endpoint | Method | Status |\n"
    out += "|---|---|---|---|---|\n"

    matched_backend = set()
    for f_method, f_ep, f_file in frontend_endpoints:
        status = "❌ MISSING IN BACKEND"
        matched_b_ep = "None"
        
        for b_method, b_ep in backend_endpoints:
            # Check for direct route matches or parameter mismatches
            # Transform variable params to standard regex
            b_ep_regex = b_ep.replace('?', '').replace(':id', '[^/]+').replace(':studentId', '[^/]+').replace(':classId', '[^/]+').replace(':date', '[^/]+').replace(':docType', '[^/]+')
            f_ep_regex = f_ep.replace('?', '').replace(':id', '[^/]+').replace(':studentId', '[^/]+').replace(':classId', '[^/]+').replace(':date', '[^/]+').replace(':docType', '[^/]+')
            
            if b_method == f_method:
                # Strip trailing slashes
                be_s = b_ep.rstrip('/')
                fe_s = f_ep.rstrip('/')
                if be_s == fe_s:
                    status = "✅ OK"
                    matched_b_ep = b_ep
                    matched_backend.add((b_method, b_ep))
                    break
                # Special cases such as missing parameters but path prefix match
                elif fe_s.startswith(be_s) or be_s.startswith(fe_s):
                    # Usually means a mismatch in ID parsing
                    status = "✅ OK / PARAM MISMATCH"
                    matched_b_ep = b_ep
                    matched_backend.add((b_method, b_ep))
                    break

        out += f"| `{f_file}` | `{f_ep}` | `{matched_b_ep}` | `{f_method}` | {status} |\n"

    for b_method, b_ep in backend_endpoints:
        if (b_method, b_ep) not in matched_backend:
            out += f"| `Unused/External` | `None` | `{b_ep}` | `{b_method}` | ⚠️ UNUSED IN FRONTEND |\n"

    # 2. Database & Data Models Comparison
    out += "\n## Data Models Comparison\n\n"
    out += "| Frontend Model | Backend Table Found | Status |\n"
    out += "|---|---|---|\n"
    
    frontend_models = ['User', 'StudentProfile', 'ODRequest', 'LeaveRequest', 'ResultUpload', 'Notification', 'AuditLog', 'Campus', 'Department', 'FeedPost', 'Class', 'AttendanceRecord']
    
    # Static checking since we know what tables are there from the db schema parse
    tables = ['users', 'roles', 'colleges', 'departments', 'clusters', 'student_profiles', 'leave_requests', 'od_requests', 'results', 'notifications', 'mentor_mappings', 'classes', 'class_student_mapping', 'attendance_records', 'feed_posts', 'parent_student_mapping', 'system_alerts', 'audit_logs']
    
    for fm in frontend_models:
        guess = fm.lower().replace('request', '_requests').replace('upload', 's').replace('log', '_logs').replace('campus', 'colleges').replace('record', '_records').replace('post', '_posts')
        if guess in tables or fm.lower() + 's' in tables:
            out += f"| `{fm}` | `{guess}` | ✅ MATCH |\n"
        else:
            out += f"| `{fm}` | `None Detected` | ❌ MISSING DB ENTITY |\n"

    with open(r'd:\database_sns\FRONTEND_BACKEND_INTEGRATION_MAP.md', 'w', encoding='utf-8') as mapf:
        mapf.write(out)
        
    print("Done generating V4")

if __name__ == "__main__":
    main()
