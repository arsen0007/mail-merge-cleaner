import streamlit as st
import pandas as pd
import io

# --- Page Configuration ---
st.set_page_config(
    page_title="Mail Merge Pro",
    page_icon="📄",
    layout="centered"
)

# --- MINIMALIST & PROFESSIONAL UI (CSS) ---
st.markdown("""
<style>
    /* --- Use a standard, professional font --- */
    html, body, .stApp {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    /* --- Clean, white background --- */
    .stApp {
        background-color: #FFFFFF;
    }

    /* --- Remove Streamlit's default branding --- */
    header, .st-emotion-cache-18ni7ap {
        visibility: hidden;
    }

    /* --- Main content container for readability --- */
    .st-emotion-cache-1y4p8pa {
       padding: 0;
       max-width: 720px; /* Set a max-width for comfortable reading */
       margin: auto;
    }

    /* --- Typography: High contrast and clear hierarchy --- */
    h1, h2, h3, h4, h5, h6 {
        color: #111111; /* Strong black for headers */
        font-weight: 600;
    }
    h1 {
        font-size: 2.2rem;
        font-weight: 700;
        text-align: center;
        padding-top: 1rem;
    }
    h2 {
        font-size: 1.5rem;
        margin-top: 2rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #DDDDDD; /* Subtle separator */
    }
    p, .st-emotion-cache-1g6goon, .st-emotion-cache-1y4p8pa p {
        color: #333333 !important; /* Dark gray for body text */
        font-size: 1rem;
    }
    .stCaption {
        text-align: center;
        color: #666666 !important;
        padding-bottom: 1rem;
    }

    /* --- Widget Styling: Clean and functional --- */
    .stButton>button {
        border-radius: 6px;
        font-weight: 500;
        padding: 0.5rem 1rem;
        transition: none; /* No flashy transitions */
        border: 1px solid #DDDDDD;
    }
    /* Primary Button: A single, solid accent color */
    .stButton>button[kind="primary"] {
        background-color: #0d6efd; /* Standard, professional blue */
        color: white;
        border-color: #0d6efd;
    }
    /* Download Button: Clear, functional green */
    .stDownloadButton>button {
        background-color: #198754; /* Standard green */
        color: white;
        border-color: #198754;
    }
    .stFileUploader {
        border: 1px solid #DDDDDD;
        background-color: #FAFAFA;
        border-radius: 6px;
        padding: 1.5rem;
    }
    .stMetric {
        background-color: #FAFAFA;
        border: 1px solid #DDDDDD;
        border-radius: 6px;
        padding: 1rem;
    }
    .stExpander {
        border: 1px solid #DDDDDD !important;
        border-radius: 6px !important;
    }
</style>
""", unsafe_allow_html=True)


# --- Session State Initialization ---
if 'processing_complete' not in st.session_state:
    st.session_state.processing_complete = False
    st.session_state.cleaned_df = pd.DataFrame()
    st.session_state.metrics = {}


# --- Main App Content ---
with st.container():
    st.title("Mail Merge Pro")
    st.caption("A simple tool to clean and prepare your mail merge lists.")
    
    # --- Step 1: Upload ---
    st.header("1. Upload Your List")
    uploaded_file = st.file_uploader(
        "Upload your CSV or Excel file.",
        type=["csv", "xlsx"],
        label_visibility="collapsed"
    )

    if uploaded_file:
        # --- Step 2: Process ---
        if st.button("Clean and Prepare List", type="primary", use_container_width=True):
            try:
                with st.spinner("Analyzing and cleaning..."):
                    df = None
                    if uploaded_file.name.endswith('.csv'):
                        df = pd.read_csv(uploaded_file, encoding='ISO-8859-1')
                    elif uploaded_file.name.endswith('.xlsx'):
                        df = pd.read_excel(uploaded_file)
                    
                    if df is not None:
                        original_rows = len(df)
                        email_column = 'BCRI Email:'
                        
                        if email_column not in df.columns:
                            st.error(f"Column '{email_column}' not found. Please ensure your file has this exact column name.")
                        else:
                            df[email_column] = df[email_column].astype(str).str.split(';')
                            df = df.explode(email_column)
                            df[email_column] = df[email_column].str.strip()
                            df.dropna(subset=[email_column], inplace=True)
                            df = df[df[email_column] != '']
                            duplicates_found = len(df) - len(df.drop_duplicates(subset=[email_column]))
                            
                            df_deduped = df.drop_duplicates(subset=[email_column])
                            df_deduped.reset_index(drop=True, inplace=True)
                            
                            st.session_state.cleaned_df = df_deduped
                            st.session_state.processing_complete = True
                            st.session_state.metrics = {
                                "Original Recipients": original_rows,
                                "Final Recipients": len(df_deduped),
                                "Duplicates Removed": duplicates_found
                            }
            except Exception as e:
                st.error(f"An error occurred: {e}")
    
    # --- Step 3: Download ---
    st.header("2. Download Your Clean List")

    if not st.session_state.processing_complete:
        st.info("Your results will appear here after processing.")
    else:
        st.success("Your list is ready.")
        
        metric_col1, metric_col2, metric_col3 = st.columns(3)
        metric_col1.metric("Original", st.session_state.metrics["Original Recipients"])
        metric_col2.metric("Final", st.session_state.metrics["Final Recipients"])
        metric_col3.metric("Removed", st.session_state.metrics["Duplicates Removed"])
        
        @st.cache_data
        def convert_df_to_csv(df):
            return df.to_csv(index=False).encode('utf-8')
        
        csv_data = convert_df_to_csv(st.session_state.cleaned_df)
        
        st.download_button(
            label="Download Cleaned List (.csv)",
            data=csv_data,
            file_name=f"cleaned_{uploaded_file.name.split('.')[0]}.csv",
            mime="text/csv",
            use_container_width=True
        )

# --- Email Template Library ---
st.header("3. Email Template Library")
st.write("Click on a version to expand it, then copy the subject and body for your mail merge.")

with st.expander("Version 1: Formal & Thorough"):
    st.subheader("Subject Line")
    st.code("Recredentialing Request – Updated Information Needed", language=None)
    st.subheader("Email Body")
    body = """Dear [Attorney’s Name],

I hope this message finds you well.

I’m reaching out on behalf of the Legal Provider Network at Workplace Options as part of our recredentialing efforts for participating attorneys. To help us maintain accurate and up-to-date records, we kindly ask that you confirm or provide the following:
- A copy of your current professional liability insurance policy (declarations page is sufficient)
- Confirmation of your current contact information (email, phone, mailing address)
- Any updates regarding your practice areas or changes in staff involved in client intake and scheduling.

Your cooperation helps ensure continuity in referrals and supports our compliance standards. Please reply at your earliest convenience with the requested details, or reach out if you have any questions."""
    st.text_area("V1 Body", body, height=300, key="v1_body")

# ... (The rest of your expanders for other templates would go here)


# --- Mail Merge Tutorial ---
st.header("4. Mail Merge Tutorial")
with st.expander("Click here for a step-by-step visual guide"):
    st.info("Follow these steps in MS Word after you have downloaded your cleaned list.")
    
    st.subheader("Step 1: Open Microsoft Word")
    st.write("Start with a blank document or open your letter template.")
    st.image("images/step1_open_word.png", caption="Start with a blank document.")
    
    # ... (The rest of your tutorial steps would go here)

# --- Footer ---
st.markdown("<hr style='border: 1px solid #DDDDDD; margin-top: 2rem;'><p style='text-align: center; color: #AAAAAA;'>Created by Tousif Ali</p>", unsafe_allow_html=True)