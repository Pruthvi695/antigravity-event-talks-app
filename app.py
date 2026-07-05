import ssl
import urllib.request
import xml.etree.ElementTree as ET
import logging
from flask import Flask, render_template, jsonify
from bs4 import BeautifulSoup, NavigableString

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fetch_and_parse_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    context = ssl._create_unverified_context()
    
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, context=context, timeout=15) as response:
            xml_data = response.read()
    except Exception as e:
        logger.error(f"Error fetching BigQuery release notes XML: {e}")
        raise e

    try:
        root = ET.fromstring(xml_data)
        ns = "{http://www.w3.org/2005/Atom}"
        entries = root.findall(f"{ns}entry")
        
        all_updates = []
        
        for idx, entry in enumerate(entries):
            title = entry.find(f"{ns}title")
            title_text = title.text.strip() if title is not None and title.text else "Unknown Date"
            
            updated = entry.find(f"{ns}updated")
            updated_text = updated.text.strip() if updated is not None and updated.text else ""
            
            link_elem = entry.find(f"{ns}link")
            link = link_elem.attrib.get('href', '').strip() if link_elem is not None else ""
            
            content_elm = entry.find(f"{ns}content")
            if content_elm is None or not content_elm.text:
                continue
            
            html_content = content_elm.text
            soup = BeautifulSoup(html_content, 'html.parser')
            
            h3s = soup.find_all('h3')
            if not h3s:
                # Fallback if there are no h3 tags: treat the entire content as one update
                text_content = soup.get_text().strip()
                all_updates.append({
                    'id': f"entry-{idx}-0",
                    'date': title_text,
                    'updated_raw': updated_text,
                    'link': link,
                    'type': 'Update',
                    'html': html_content.strip(),
                    'text': " ".join(text_content.split())
                })
                continue
                
            for sub_idx, h3 in enumerate(h3s):
                update_type = h3.get_text().strip()
                
                sibling_htmls = []
                sibling_texts = []
                curr = h3.next_sibling
                while curr and curr.name != 'h3':
                    if isinstance(curr, NavigableString):
                        sibling_texts.append(str(curr))
                    else:
                        sibling_htmls.append(str(curr))
                        sibling_texts.append(curr.get_text())
                    curr = curr.next_sibling
                    
                update_html = "".join(sibling_htmls).strip()
                if not update_html:
                    continue
                    
                update_text = " ".join(sibling_texts).strip()
                update_text = " ".join(update_text.split())
                
                # Check for sub-IDs to anchor properly
                # If the H3 or content has an ID, we could append it, otherwise use index
                item_id = f"entry-{idx}-{sub_idx}"
                
                all_updates.append({
                    'id': item_id,
                    'date': title_text,
                    'updated_raw': updated_text,
                    'link': link,
                    'type': update_type,
                    'html': update_html,
                    'text': update_text
                })
                
        return all_updates
    except Exception as e:
        logger.error(f"Error parsing BigQuery release notes XML: {e}")
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    try:
        updates = fetch_and_parse_feed()
        return jsonify({
            'success': True,
            'updates': updates,
            'count': len(updates)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
