# api.py
import sqlite3
import pandas as pd
import io
import docx
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

# --- Database Setup ---
DB_FILE = "templates.db"

def init_db():
    """Initializes the database and pre-populates it with all 6 default templates if it's empty."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            subject TEXT NOT NULL,
            body TEXT NOT NULL
        )
    """)
    
    cursor.execute("SELECT COUNT(id) FROM templates")
    if cursor.fetchone()[0] == 0:
        default_templates = [
            ("Version 1: Formal & Thorough", "Recredentialing Request – Updated Information Needed", "Dear [Attorney’s Name],\n\nI hope this message finds you well. I’m reaching out on behalf of the Legal Provider Network at Workplace Options as part of our recredentialing efforts for participating attorneys.\n\nTo help us maintain accurate and up-to-date records, we kindly ask that you confirm or provide the following:\n- A copy of your current professional liability insurance policy (declarations page is sufficient)\n- Confirmation of your current contact information (email, phone, mailing address)\n- Any updates regarding your practice areas or changes in staff involved in client intake and scheduling.\n\nYour cooperation helps ensure continuity in referrals and supports our compliance standards. Please reply at your earliest convenience with the requested details, or reach out if you have any questions."),
            ("Alternate Version 1A: Formal & Thorough", "Request for Updated Credentials – Legal Network Profile", "Dear [Attorney’s Name],\n\nI hope this message finds you in good health and high spirits. I’m contacting you on behalf of the Workplace Options Legal Network as part of our periodic recredentialing process.\n\nTo ensure your profile remains active and up to date, we kindly ask you to review and share the following:\n- A valid copy of your current professional liability insurance (declarations page is acceptable)\n- A confirmation of your preferred contact details (email, phone number, mailing address)\n- Any recent modifications to your practice areas or changes in staff involved in client scheduling or intake\n\nThis information allows us to maintain the integrity and reliability of our provider network. Your cooperation is appreciated, and we’re happy to assist with any questions you may have."),
            ("Version 2: Friendly & Concise", "Quick Check-In – Help Us Update Your Profile", "Hi [Attorney’s Name],\n\nHope you're doing well! We're currently updating provider profiles for our legal network and just need a few quick items from you:\n- A copy of your current liability insurance (declarations page is fine)\n- Confirmation of your preferred contact information\n- Any updates to your practice focus or support staff you'd like us to know about\n\nFeel free to respond directly to this email. Let us know if you have any questions—we’re happy to help."),
            ("Alternate Version 2A: Friendly & Concise", "Just a Quick Update for Your Profile", "Hi [Attorney’s Name],\n\nI hope all’s going well with you! We’re refreshing our records and wanted to touch base to make sure we have the latest information on your profile.\n\nCould you send us:\n- A current copy of your liability insurance\n- Your preferred contact information\n- Any updates to your practice areas or team members who assist with calls or scheduling\n\nIt’ll only take a moment, and you can reply directly to this email."),
            ("Version 3: Neutral & Direct", "Follow-Up – Recredentialing Information Needed", "Dear [Attorney’s Name],\n\nWe are following up regarding our request for updated information as part of our attorney network recredentialing.\n\nTo complete your profile review, we kindly need:\n- A copy of your professional liability insurance policy\n- Updated contact details\n- Any changes to your practice areas or staff we should be aware of\n\nPlease respond at your earliest convenience. If we don’t receive a response after 3 attempts, we may need to temporarily pause referrals until your profile is complete."),
            ("Alternate Version 3A: Neutral & Direct", "Reminder: Information Needed to Complete Recredentialing", "Dear [Attorney’s Name],\n\nThis is a quick reminder as part of our recredentialing project to ensure all provider records are accurate and current.\n\nTo finalize your profile, we still need the following:\n- Updated professional liability insurance documentation\n- Verified contact information\n- Any revisions to your legal focus areas or office staff assisting with clients\n\nIf you’ve already submitted this, feel free to disregard. Otherwise, we’d appreciate your reply at your earliest convenience. After three outreach attempts, we may need to pause referrals until we can verify your information.")
        ]
        cursor.executemany("INSERT INTO templates (title, subject, body) VALUES (?, ?, ?)", default_templates)
    
    conn.commit()
    conn.close()

# --- Initialize Flask App ---
app = Flask(__name__)
CORS(app)

# --- Helper Function for Cleaning Logic (UPDATED) ---
def get_cleaned_data(email_column, file=None, json_data=None):
    """
    Cleans data from either an uploaded file or raw JSON data.
    One of 'file' or 'json_data' must be provided.
    """
    if file:
        file.seek(0)
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file, encoding='ISO-8859-1')
        elif file.filename.endswith('.xlsx'):
            df = pd.read_excel(file)
        else:
            raise ValueError("Unsupported file type. Please use CSV or XLSX.")
    elif json_data:
        # Create DataFrame from JSON data sent by the frontend grid
        df = pd.DataFrame(json_data)
    else:
        raise ValueError("No data provided. Please either upload a file or provide JSON data.")

    if email_column not in df.columns:
        raise ValueError(f"The selected column '{email_column}' was not found in the data.")

    original_rows = len(df)
    original_headers = list(df.columns)

    # Proceed with the same cleaning logic
    df_clean = df.dropna(subset=[email_column])
    df_clean[email_column] = df_clean[email_column].astype(str).str.split(';')
    df_exploded = df_clean.explode(email_column)
    df_exploded[email_column] = df_exploded[email_column].str.strip()
    df_exploded.dropna(subset=[email_column], inplace=True)
    df_exploded = df_exploded[df_exploded[email_column] != '']
    
    duplicates = df_exploded[df_exploded.duplicated(subset=[email_column], keep=False)]
    removed_duplicates_list = sorted(list(duplicates[email_column].unique()))
    
    cleaned_df = df_exploded.drop_duplicates(subset=[email_column])
    
    analysis = {
        "metrics": {"original_rows": original_rows, "final_rows": len(cleaned_df), "removed_count": len(removed_duplicates_list)},
        "headers": original_headers,
        "removed_duplicates": removed_duplicates_list
    }
    
    return cleaned_df, analysis

# --- API Endpoints (UPDATED) ---
@app.route('/api/get_headers', methods=['POST'])
def get_headers_endpoint():
    try:
        if 'file' in request.files:
            file = request.files['file']
            if file.filename.endswith('.csv'): df = pd.read_csv(file, encoding='ISO-8859-1', nrows=1)
            elif file.filename.endswith('.xlsx'): df = pd.read_excel(file, nrows=1)
            else: return jsonify({"error": "Unsupported file type"}), 400
            return jsonify({"headers": list(df.columns)})
        else:
            # For manual input, headers are determined on the frontend.
            # This endpoint is primarily for file uploads now.
            return jsonify({"error": "File upload required to extract headers."}), 400
    except Exception as e: return jsonify({"error": f"Could not read file headers: {str(e)}"}), 500

@app.route('/api/analyze_file', methods=['POST'])
def analyze_file_endpoint():
    try:
        if 'file' in request.files:
            file = request.files['file']
            email_column = request.form.get('email_column')
            if not email_column: return jsonify({"error": "Email column not specified"}), 400
            _, analysis = get_cleaned_data(email_column, file=file)
        else:
            data = request.get_json()
            if not data or 'email_column' not in data or 'grid_data' not in data:
                return jsonify({"error": "Invalid JSON data provided"}), 400
            email_column = data['email_column']
            grid_data = data['grid_data']
            _, analysis = get_cleaned_data(email_column, json_data=grid_data)
        
        return jsonify(analysis)
    except Exception as e: return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/download_cleaned_file', methods=['POST'])
def download_cleaned_file_endpoint():
    try:
        if 'file' in request.files:
            file = request.files['file']
            email_column = request.form.get('email_column')
            if not email_column: return jsonify({"error": "Email column not specified"}), 400
            cleaned_df, _ = get_cleaned_data(email_column, file=file)
            filename = f"cleaned_{file.filename.split('.')[0]}.csv"
        else:
            data = request.get_json()
            if not data or 'email_column' not in data or 'grid_data' not in data:
                return jsonify({"error": "Invalid JSON data provided"}), 400
            email_column = data['email_column']
            grid_data = data['grid_data']
            cleaned_df, _ = get_cleaned_data(email_column, json_data=grid_data)
            filename = "cleaned_manual_data.csv"

        buffer = io.BytesIO()
        cleaned_df.to_csv(buffer, index=False, encoding='utf-8')
        buffer.seek(0)
        return send_file(buffer, as_attachment=True, download_name=filename, mimetype='text/csv')
    except Exception as e: return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# --- Template Endpoints (Unchanged) ---
@app.route('/api/templates', methods=['GET'])
def get_templates():
    conn = sqlite3.connect(DB_FILE); conn.row_factory = sqlite3.Row; cursor = conn.cursor()
    cursor.execute("SELECT * FROM templates ORDER BY id"); templates = [dict(row) for row in cursor.fetchall()]
    conn.close(); return jsonify(templates)

@app.route('/api/templates', methods=['POST'])
def create_template():
    data = request.get_json(); conn = sqlite3.connect(DB_FILE); cursor = conn.cursor()
    cursor.execute("INSERT INTO templates (title, subject, body) VALUES (?, ?, ?)", (data['title'], data['subject'], data['body']))
    conn.commit(); new_id = cursor.lastrowid; conn.close(); return jsonify({"id": new_id, **data}), 201

@app.route('/api/templates/<int:template_id>', methods=['PUT'])
def update_template(template_id):
    data = request.get_json(); conn = sqlite3.connect(DB_FILE); cursor = conn.cursor()
    cursor.execute("UPDATE templates SET title = ?, subject = ?, body = ? WHERE id = ?", (data['title'], data['subject'], data['body'], template_id))
    conn.commit(); conn.close(); return jsonify({"id": template_id, **data})

@app.route('/api/templates/<int:template_id>', methods=['DELETE'])
def delete_template(template_id):
    conn = sqlite3.connect(DB_FILE); cursor = conn.cursor()
    cursor.execute("DELETE FROM templates WHERE id = ?", (template_id,)); conn.commit(); conn.close(); return '', 204

@app.route('/api/create_word_doc', methods=['POST'])
def create_word_doc_endpoint():
    data = request.get_json();
    if not data or 'body' not in data: return jsonify({"error": "No text body provided"}), 400
    document = docx.Document(); document.add_paragraph(data['body']); buffer = io.BytesIO()
    document.save(buffer); buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name='mail_merge_template.docx', mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document')

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5001)

