from pathlib import Path
import json, html, zipfile
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape,A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, black
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from PIL import Image
root=Path(__file__).resolve().parents[1];out=root/'output/pdf/aitrace-sponsor-showcase.pdf';data=json.loads((root/'output/showcase/screenshots.json').read_text());shots={s['id']:s for s in data['screens']}
pdfmetrics.registerFont(TTFont('Arial','C:/Windows/Fonts/arial.ttf'));pdfmetrics.registerFont(TTFont('ArialBold','C:/Windows/Fonts/arialbd.ttf'));pdfmetrics.registerFontFamily('Arial',normal='Arial',bold='ArialBold',italic='Arial',boldItalic='ArialBold')
W,H=landscape(A4);M=34;C=W-2*M;blue=HexColor('#063469');muted=HexColor('#465567');border=HexColor('#D9E3EF')
c=canvas.Canvas(str(out),pagesize=(W,H),pageCompression=1);c.setTitle('AITrace sponsor showcase');c.setAuthor('AITrace capstone project team');c.setSubject('Application walkthrough for Sri Ramakrishna Engineering College');
normal=ParagraphStyle('Body',fontName='Arial',fontSize=11,leading=15,textColor=muted)
small=ParagraphStyle('Small',fontName='Arial',fontSize=9,leading=12,textColor=muted)
caption=ParagraphStyle('Caption',fontName='Arial',fontSize=11,leading=15,textColor=black)
def para(text,x,top,width,style=normal):
 p=Paragraph(text,style);_,h=p.wrap(width,1000);p.drawOn(c,x,top-h);return top-h

def base(n,title,intro):
 c.setFillColor(blue);c.setFont('ArialBold',9);c.drawString(M,H-27,'AITRACE  |  SPONSOR WALKTHROUGH')
 c.setFillColor(black);c.setFont('ArialBold',25);c.drawString(M,H-65,title)
 para(intro,M,H-83,C)
 c.setFillColor(muted);c.setFont('Arial',8);c.drawString(M,21,'27 September 2026  |  Fictional demonstration data  |  Capstone prototype');c.drawRightString(W-M,21,f'{n} / 9')

def shot(id,x,top,width,height,full=False):
 path=root/('output/showcase/screenshots' if full else 'test-results/showcase-layout')/(id+'.png')
 im=Image.open(path);iw,ih=im.size;scale=min(width/iw,height/ih);dw,dh=iw*scale,ih*scale;dx=x+(width-dw)/2;dy=top-dh
 c.drawImage(ImageReader(im),dx,dy,width=dw,height=dh,mask='auto');c.setStrokeColor(border);c.setLineWidth(.5);c.rect(dx,dy,dw,dh)
 return dy

def pair(n,title,intro,left,right,takeaway):
 base(n,title,intro)
 # One enlarged excerpt per page; companion features remain described and in the full pack.
 selected={2:right[0],3:left[0],4:right[0],5:left[0],6:left[0],7:right[0],8:right[0]}[n]
 shot(selected,M,H-124,C,300)
 cw=(C-24)/2
 for x,(_,heading,body) in [(M,left),(M+cw+24,right)]:
  para('<b>'+heading+'</b><br/>'+body,x,155,cw,caption)
 para('Excerpt: '+selected+'.png. Both workflows have full-resolution captures in the screenshot pack.',M,82,C,small)
 para(takeaway,M,61,C,small);c.showPage()

base(1,'AITrace sponsor showcase','An integrated local prototype for Australian SMEs to record AI use, review governance risks and track follow-up work.')
para('Prepared for Sri Ramakrishna Engineering College<br/>University of Canberra ICT Capstone<br/>Project 2026 S2R 04',M,H-135,226)
para('The walkthrough follows a practical journey: register a tool, complete an assessment, assign an action, maintain policy evidence and monitor progress.',M,H-209,226)
para('<b>For sponsor review</b><br/>Confirm the questionnaire and risk rules, review the SME workflow, and identify changes needed before user acceptance.',M,H-297,226)
shot('02-overview',M+247,H-127,C-247,351,full=True)
para('The overview connects recorded AI uses, assessment coverage, outstanding actions and policy reviews. The example shows four AI uses and two open actions.',M+247,102,C-247,small)
para('All accounts and records shown are fictional. Risk classifications use demonstration rules and do not certify compliance. The complete screenshot pack contains 32 full-page captures.',M,59,C,small);c.showPage()
pair(2,'Access and guidance','A shared workspace with account-based access and a plain-language starting point.',
 ('01-sign-in','Sign in','Users enter their organisation account. Administrators, Compliance Officers and Staff Users have different permissions.'),
 ('16-guide','Getting started guide','The guide explains the register, review and follow-up workflow and the limits of the prototype.'),
 'The app runs locally without an AI service or API key. A new installation needs an operator-created Administrator account.')
pair(3,'Make AI use visible','Bring formal records and voluntary disclosures into one register.',
 ('03-registry','AI use registry','Search and filter tools, inspect ownership, sensitivity and approval, and export PDF or CSV summaries.'),
 ('15-disclosure','Disclose an AI tool','Staff can report an unregistered use. It enters the register as Not reviewed for a manager to assess.'),
 'Approval is separate from risk. Details, edit forms and decision-history captures are included in the screenshot pack.')
pair(4,'Assess and explain','Save progress and retain an understandable record of the assessment result.',
 ('08-assessment-draft','Save an assessment draft','A versioned questionnaire can be saved before it is complete and reopened later.'),
 ('09-assessment-result','Understand the result','Submitted responses are retained with the matching rules, explanations and suggested follow-up actions.'),
 'Current questions and thresholds are synthetic examples. Sponsor-approved content remains a decision before real governance use.')
pair(5,'Act and retain evidence','Give follow-up work an owner and keep policy evidence connected to the assessment topics.',
 ('10-actions','Track actions','Managers assign an account, due date and status, optionally linking a submitted assessment. Updates retain history.'),
 ('12-policies','Manage policy versions','Upload PDF or text files, link checklist topics, assign a reviewer and set the next review date. Earlier versions remain available.'),
 'The excerpt shows saved actions. Full-page captures include the policy library, creation and upload forms. Staff can read assigned actions and policies.')
pair(6,'Keep follow up visible','Reminders connect approaching deadlines with the person responsible.',
 ('14-notifications','Notifications and timing','Administrators configure reminder timing. Managers can run a check, and recipients receive an individual inbox.'),
 ('28-staff-actions','Assigned staff work','Staff see the actions assigned to them; managers control status updates and the wider action register.'),
 'Reminders are in-app and require the server to run. Repeated checks do not duplicate the same eligible notification; no email delivery is configured.')
pair(7,'Manage accounts and access','Administrator controls support the everyday account lifecycle.',
 ('17-accounts','Account directory','View and search organisation accounts, create users and inspect recent account activity.'),
 ('18-account-controls','Password and role controls','Reset passwords, change roles or disable access. Resets revoke sessions and require a new password at the next sign-in.'),
 'Passwords are not displayed in the directory. Separate captures show account creation and the mandatory password-change flow.')
pair(8,'Configure the workspace','Choose a consistent appearance and prepare the local HTTPS certificate.',
 ('20-appearance','Organisation appearance','Select SREC blue or Slate. Each person can also choose light or dark mode.'),
 ('21-certificates','Administrator certificates','Generate a temporary self-signed pair, inspect expiry and stage a matching replacement certificate and key.'),
 'Certificate activation requires server configuration and restart. Temporary certificates are not publicly trusted; encrypted storage and trusted deployment remain operator acceptance tasks.')
base(9,'Personal security and sponsor review','The application also provides self-service password changes and responsive layouts.')
cw=(C-22)/2;top=H-133
c.setFillColor(black);c.setFont('ArialBold',13);c.drawString(M,top,'Change your password');shot('22-change-password',M,top-15,cw,240)
para('Verify the current password, choose a new one and sign out existing sessions. The reset flow requires this step before returning to the workspace.',M,top-271,cw,caption)
x=M+cw+22;c.setFillColor(black);c.setFont('ArialBold',13);c.drawString(x,top,'Mobile and role views');shot('25-mobile-overview',x,top-15,122,252)
para('The screenshot pack includes mobile overview and registry views, Staff and Compliance Officer workspaces, and both alternative appearances.',x+138,top-24,cw-138)
para('<b>Suggested sponsor discussion</b><br/>Are the roles and workflow right for the intended SMEs?<br/><br/>Which questions, explanations and actions should the approved assessment use?<br/><br/>What evidence is needed for the final demonstration and acceptance?',x+138,top-133,cw-138,small)
para('Implementation checks passed: 68 application tests and 22 browser tests, including automated accessibility checks. Human SME and screen-reader UAT, sponsor content approval and final handover remain outstanding.',M,71,C,small);c.showPage();c.save()
# Full-resolution, self-contained screenshot gallery for the requested complete capture set.
items=[]
for s in data['screens']:
 items.append(f'<section><h2>{html.escape(s["title"])}</h2><p>{html.escape(s["role"])} &middot; {html.escape(s["id"])}</p><a href="{s["file"]}"><img loading="lazy" src="{s["file"]}" alt="{html.escape(s["title"])} screen"/></a></section>')
gallery='<!doctype html><html lang="en"><meta charset="utf-8"><title>AITrace complete screenshot gallery</title><style>body{font:16px Arial,sans-serif;color:#162b44;background:#f4f7fb;margin:0 auto;max-width:1250px;padding:36px}h1,h2{color:#102c51}section{background:white;padding:24px;margin:28px 0;border:1px solid #dae2ee;border-radius:12px}img{width:100%;height:auto}p{line-height:1.6}a{color:#075caf}</style><h1>AITrace complete screenshot gallery</h1><p>27 September 2026. All 13 main screens plus key form, role, theme and mobile states: 32 full-page captures. All data is fictional. Click a screenshot to open its original resolution. No operational credentials or private certificate files are included.</p>'+''.join(items)+'</html>'
(root/'output/showcase/index.html').write_text(gallery,encoding='utf-8')
(root/'output/showcase/README.txt').write_text('AITrace sponsor screenshot pack\n27 September 2026\n\nOpen index.html in a browser to view all 32 captures. Click any screenshot for full resolution. Screenshots are actual app captures using an isolated fictional organisation. No live user data, passwords, database files or private keys are included.\n\nCoverage: Sign in plus all 12 workspace navigation screens; registry add/edit/details, assessment draft/result/history, action history, policy review, account management/creation, forced password change, Staff/Compliance Officer views, mobile layouts, dark mode and Slate style.\n\nThe PDF showcase uses screen excerpts to keep the walkthrough concise. Full-page originals are in screenshots/. Screenshot metadata and roles are listed in screenshots.json.\n',encoding='utf-8')
with zipfile.ZipFile(root/'output/showcase/aitrace-screenshot-pack.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted((root/'output/showcase/screenshots').glob('*.png')):z.write(p,'screenshots/'+p.name)
 for name in ['README.txt','index.html','screenshots.json']:z.write(root/'output/showcase'/name,name)
print(out)
print('Created 9-page sponsor showcase and 32-screen gallery/ZIP.')
