import streamlit as st
import pandas as pd
import io

# --- Page Configuration ---
st.set_page_config(
    page_title="Mail Merge Pro",
    page_icon="✉️",
    layout="centered" # Use centered layout
)

# --- Advanced CSS for a custom webpage look ---
st.markdown("""
<style>
    /* Hide Streamlit's default elements */
    .stApp {
        background-image: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    }
    header, .st-emotion-cache-18ni7ap { /* Hide the header and hamburger menu */
        visibility: hidden;
    }
    /* Main container as a styled card */
    .st-emotion-cache-1y4p8pa { /* This targets the main block container */
        padding: 2rem 2.5rem 3rem 2.5rem;
        border-radius: 20px;
        background-color: rgba(255, 255, 255, 0.9);
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        border: 1px solid rgba(255, 255, 255, 0.18);
    }
    /* Button Styling */
    .stButton>button {
        border-radius: 50px;
        font-weight: 500;
        padding: 0.75rem 1.5rem;
        transition: all .3s ease-in-out;
    }
    .stDownloadButton>button {
        background-color: #28a745;
        color: white;
        border: none;
    }
    .stDownloadButton>button:hover {
        background-color: #218838;
    }
</style>
""", unsafe_allow_html=True)


# --- Session State Initialization ---
if 'processing_complete' not in st.session_state:
    st.session_state.processing_complete = False
    st.session_state.cleaned_df = pd.DataFrame()
    st.session_state.metrics = {}

# --- Main App Content inside a single container ---
with st.container():
    st.title("✉️ Mail Merge Pro")
    st.caption("The fastest way to prepare your recipient lists.")
    st.divider()

    # --- Step 1: Upload ---
    st.header("1. Upload Your List")
    uploaded_file = st.file_uploader("Drag and drop your CSV file here.", type="csv", label_visibility="collapsed")

    if uploaded_file:
        # --- Step 2: Process ---
        if st.button(f"✨ Clean and Prepare List", type="primary", use_container_width=True):
            try:
                with st.spinner("Analyzing and cleaning..."):
                    df = pd.read_csv(uploaded_file, encoding='ISO-8859-1')
                    original_rows = len(df)
                    email_column = 'BCRI Email:'
                    
                    if email_column not in df.columns:
                        st.error(f"Column '{email_column}' not found.")
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

    st.divider()

    # --- Step 3: Download ---
    st.header("3. Download Your Clean List")

    if not st.session_state.processing_complete:
        st.info("Your results will appear here after processing.")
    else:
        st.success("Your list is ready!")
        
        metric_col1, metric_col2, metric_col3 = st.columns(3)
        metric_col1.metric("Original", st.session_state.metrics["Original Recipients"])
        metric_col2.metric("Final", st.session_state.metrics["Final Recipients"])
        metric_col3.metric("Removed", st.session_state.metrics["Duplicates Removed"])
        
        @st.cache_data
        def convert_df_to_csv(df):
            return df.to_csv(index=False).encode('utf-8')
        
        csv_data = convert_df_to_csv(st.session_state.cleaned_df)
        
        st.download_button(
            label="📥 Download Cleaned List",
            data=csv_data,
            file_name=f"cleaned_{uploaded_file.name}",
            mime="text/csv",
            use_container_width=True
        )

# --- Footer ---
st.markdown("<div style='text-align: center; margin-top: 2rem; color: #777;'>Created by Tousif Ali</div>", unsafe_allow_html=True)