import streamlit as st
import pandas as pd
import io

# --- Page Configuration ---
# CHANGED: The page title is now more specific to the task.
st.set_page_config(
    page_title="Mail Merge List Cleaner",
    page_icon="📬",
    layout="wide"
)

# --- Custom CSS (Remains the same for our great design) ---
st.markdown("""
<style>
    /* Main container styling for the "card" effect */
    .main .block-container {
        padding: 2rem 3rem;
        border-radius: 20px;
        background-color: #FFFFFF;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border: 1px solid #E0E0E0;
    }

    /* Modern button styling */
    .stButton>button {
        font-weight: 500;
        border-radius: 50px;
        padding: 0.75rem 1.5rem;
        border-color: #8A2BE2;
        color: #8A2BE2;
        transition: all .3s ease-in-out;
    }
    .stButton>button:hover {
        border-color: #8A2BE2;
        color: white;
        background-color: #8A2BE2;
    }
    
    /* Specific styling for the primary action button */
    div[data-testid="stHorizontalBlock"]>div:nth-child(1) .stButton>button{
        background-color: #8A2BE2;
        color: white;
    }

    /* Styling for the download button */
    div[data-testid="stDownloadButton"] > button {
        background-color: #28a745;
        color: white;
        border: none;
        border-radius: 50px;
        padding: 0.75rem 1.5rem;
    }
    div[data-testid="stDownloadButton"] > button:hover {
        background-color: #218838;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    /* Header styling */
    h1, h2 {
        color: #31333F;
    }

</style>
""", unsafe_allow_html=True)


# --- Session State Initialization (Remains the same) ---
if 'processing_complete' not in st.session_state:
    st.session_state.processing_complete = False
    st.session_state.cleaned_df = pd.DataFrame()
    st.session_state.metrics = {}


# --- App Header ---
# CHANGED: Title and caption are now specific to mail merge.
st.title("📬 Mail Merge List Cleaner")
st.caption("Prepare your CSV for a flawless mail merge. This tool cleans and deduplicates your recipient list.")
st.divider()


# --- Main Two-Column Layout ---
col1, col2 = st.columns((1, 1.5))

with col1:
    st.subheader("1. Upload Your List")
    # CHANGED: Uploader text is more specific.
    uploaded_file = st.file_uploader("Upload your mail merge recipient list (CSV)", type="csv")
    
    if uploaded_file:
        # CHANGED: Button text now reflects the action.
        if st.button(f"🚀 Prepare Mail Merge List", type="primary"):
            try:
                # CHANGED: Spinner text is more relevant.
                with st.spinner("Preparing your recipient list... Removing duplicates..."):
                    df = pd.read_csv(uploaded_file, encoding='ISO-8859-1')
                    original_rows = len(df)
                    email_column = 'BCRI Email:'
                    
                    if email_column not in df.columns:
                        st.error(f"Column '{email_column}' not found. Please check your file.")
                    else:
                        df[email_column] = df[email_column].astype(str).str.split(';')
                        df = df.explode(email_column)
                        df[email_column] = df[email_column].str.strip()
                        df.dropna(subset=[email_column], inplace=True)
                        df = df[df[email_column] != '']
                        # We need to get the count of duplicates *before* we drop them
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
                st.error(f"An error occurred during processing: {e}")

    with st.expander("📄 View Instructions", expanded=False):
        st.markdown("""
        - **File:** Must be a `.csv` file.
        - **Column:** Must contain a column named exactly `BCRI Email:`.
        - **Format:** Emails in the column can be single or separated by semicolons (`;`).
        """)

with col2:
    st.subheader("2. Your Cleaned List")

    if not st.session_state.processing_complete:
        # CHANGED: Info text is more specific.
        st.info("Your cleaned mail merge list and stats will appear here.")
    else:
        # CHANGED: Success message is updated.
        st.success("Your mail merge list is clean and ready!")
        
        # CHANGED: Metric labels are now specific to the mail merge context.
        metric_col1, metric_col2, metric_col3 = st.columns(3)
        metric_col1.metric("Original Recipients", st.session_state.metrics["Original Recipients"])
        metric_col2.metric("Final Recipients for Merge", st.session_state.metrics["Final Recipients"])
        metric_col3.metric("Duplicates Removed", st.session_state.metrics["Duplicates Removed"])
        
        st.divider()
        
        @st.cache_data
        def convert_df_to_csv(df):
            return df.to_csv(index=False).encode('utf-8')
        
        csv_data = convert_df_to_csv(st.session_state.cleaned_df)
        
        # CHANGED: Download button label is clearer.
        st.download_button(
            label="📥 Download Cleaned Mail Merge List",
            data=csv_data,
            file_name=f"cleaned_{uploaded_file.name}",
            mime="text/csv",
        )
        
        # CHANGED: Preview header is more descriptive.
        st.write("#### Preview of Your Cleaned Recipient List")
        st.dataframe(st.session_state.cleaned_df, height=300, use_container_width=True)