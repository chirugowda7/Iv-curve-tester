import io
from flask import Flask, render_template, redirect, url_for, send_file
from models.measurement import db, Measurement
from fpdf import FPDF

app = Flask(__name__)

app.config['SECRET_KEY'] = 'super_secret_key_iv_curve'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['TEMPLATES_AUTO_RELOAD'] = True

db.init_app(app)

with app.app_context():
    db.create_all()


# Home Page (Opens Dashboard Directly)
@app.route('/')
def home():
    return render_template('index.html')


# Dashboard
@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')


# History
@app.route('/history')
def history():
    data = Measurement.query.all()
    return render_template('history.html', data=data)


# Save Sample Measurement
@app.route('/save')
def save():

    measurement = Measurement(
        voc=21.5,
        isc=5.2,
        vmp=18.4,
        imp=4.8,
        pmax=88.3
    )

    db.session.add(measurement)
    db.session.commit()

    return redirect(url_for('history'))


# Delete Measurement
@app.route('/delete/<int:id>', methods=['POST'])
def delete_record(id):
    record = Measurement.query.get_or_404(id)
    db.session.delete(record)
    db.session.commit()
    return redirect(url_for('history'))


# Export Latest Measurement as PDF
@app.route('/export_pdf', methods=['GET', 'POST'])
def export_pdf():
    import base64
    import tempfile
    import os
    from flask import request

    measurement = Measurement.query.order_by(Measurement.id.desc()).first()

    pdf = FPDF()
    # Configure auto page break with a small bottom margin to maximize space
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    
    # Draw page border (10mm from edges on A4 210x297)
    pdf.set_line_width(0.5)
    pdf.rect(10.0, 10.0, 190.0, 277.0)
    # Reset line width for table borders
    pdf.set_line_width(0.2)

    pdf.set_font("Helvetica", "B", 18)
    # Give some top margin before title
    pdf.set_y(20)
    pdf.cell(0, 10, "IV Curve Tester Report", align="C", ln=True)
    pdf.ln(8)

    if measurement:
        # Table Header
        pdf.set_font("Helvetica", "B", 12)
        left_margin = 35 # Center table of width 140 on 210mm page
        
        pdf.set_x(left_margin)
        pdf.cell(90, 8, "Parameter", border=1, align="C")
        pdf.cell(50, 8, "Value", border=1, align="C", ln=True)
        
        pdf.set_font("Helvetica", "", 12)
        
        def add_row(param, value):
            pdf.set_x(left_margin)
            pdf.cell(90, 8, f"  {param}", border=1)
            pdf.cell(50, 8, value, border=1, align="C", ln=True)

        add_row("Open Circuit Voltage (Voc)", f"{measurement.voc} V")
        add_row("Short Circuit Current (Isc)", f"{measurement.isc} A")
        add_row("Maximum Voltage (Vmp)", f"{measurement.vmp} V")
        add_row("Maximum Current (Imp)", f"{measurement.imp} A")
        
        # Highlight Pmax
        pdf.set_font("Helvetica", "B", 12)
        add_row("Maximum Power (Pmax)", f"{measurement.pmax} W")
    else:
        pdf.set_font("Helvetica", "", 12)
        pdf.cell(0, 10, "No measurements found.", align="C", ln=True)

    # Embed the graph if provided via POST
    if request.method == 'POST':
        image_data = request.form.get('image')
        if image_data and ',' in image_data:
            header, encoded = image_data.split(",", 1)
            img_bytes = base64.b64decode(encoded)
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp:
                tmp.write(img_bytes)
                tmp_path = tmp.name
            
            pdf.ln(8)
            pdf.set_font("Helvetica", "B", 14)
            pdf.cell(0, 10, "I-V Characteristics Curve", align="C", ln=True)
            pdf.ln(2)
            
            # Center the image and slightly reduce size (A4 width 210, image width 130 -> x=40)
            pdf.image(tmp_path, x=40, w=130)
            os.remove(tmp_path)

    pdf_bytes = bytes(pdf.output(dest="S"))

    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name="iv_curve_report.pdf"
    )


if __name__ == "__main__":
    app.run(debug=True)