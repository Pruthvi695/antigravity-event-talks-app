import ssl
import urllib.request
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup, NavigableString

def parse_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    context = ssl._create_unverified_context()
    with urllib.request.urlopen(url, context=context) as response:
        xml_data = response.read()
    
    root = ET.fromstring(xml_data)
    ns = "{http://www.w3.org/2005/Atom}"
    entries = root.findall(f"{ns}entry")
    
    all_updates = []
    
    for entry in entries:
        title = entry.find(f"{ns}title").text
        updated = entry.find(f"{ns}updated").text
        link_elem = entry.find(f"{ns}link")
        link = link_elem.attrib.get('href') if link_elem is not None else ""
        content_elm = entry.find(f"{ns}content")
        if content_elm is None or not content_elm.text:
            continue
        
        html_content = content_elm.text
        soup = BeautifulSoup(html_content, 'html.parser')
        
        h3s = soup.find_all('h3')
        if not h3s:
            text_content = soup.get_text().strip()
            all_updates.append({
                'date': title,
                'updated_raw': updated,
                'link': link,
                'type': 'Update',
                'html': html_content,
                'text': text_content
            })
            continue
            
        for h3 in h3s:
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
            
            all_updates.append({
                'date': title,
                'updated_raw': updated,
                'link': link,
                'type': update_type,
                'html': update_html,
                'text': update_text
            })
            
    return all_updates

if __name__ == "__main__":
    updates = parse_feed()
    print(f"Parsed {len(updates)} individual updates.")
    print("\nSample Update:")
    if updates:
        sample = updates[3]  # Let's inspect index 3 (which should be from June 25, 2026 based on previous output)
        print("Date:", sample['date'])
        print("Type:", sample['type'])
        print("HTML Content:", sample['html'])
        print("Text Content:", sample['text'])
        print("Link:", sample['link'])
