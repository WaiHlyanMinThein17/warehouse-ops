"""
server.py — GPD Warehouse Ops Backend
Run: python server.py
Then open: http://localhost:5000
"""

from flask import Flask, request, send_file, jsonify
from flask.helpers import make_response
import io
import os
from datetime import date, timedelta
from openpyxl import Workbook
from openpyxl.styles import (
    Font, Alignment, Border, Side, PatternFill
)
from openpyxl.utils import get_column_letter

app = Flask(__name__, static_folder='.', static_url_path='')


# ── Serve the frontend ────────────────────────────────────────────────────────

@app.route('/')
def index():
    return app.send_static_file('index.html')


# ── Processing Log Generator ──────────────────────────────────────────────────

@app.route('/api/processing-log', methods=['GET'])
def generate_processing_log():
    station = request.args.get('station', 'MCN2')
    month   = int(request.args.get('month', date.today().month))   # 1-indexed
    year    = int(request.args.get('year',  date.today().year))

    month_names = [
        '', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]
    month_name = month_names[month]

    # ── Get all weekdays in the month ─────────────────────────────────────────
    weekdays = []
    d = date(year, month, 1)
    while d.month == month:
        if d.weekday() < 5:  # Mon=0 … Fri=4
            weekdays.append(d)
        d += timedelta(days=1)

    # ── Ordinal suffix ────────────────────────────────────────────────────────
    def ordinal(n):
        if 11 <= (n % 100) <= 13:
            return f'{n}th'
        return f'{n}{["th","st","nd","rd","th"][min(n % 10, 4)]}'

    def fmt_day(d):
        names = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
        return f'{names[d.weekday()]}, {month_name} {ordinal(d.day)}'

    # ── Build workbook ────────────────────────────────────────────────────────
    wb = Workbook()
    ws = wb.active
    ws.title = 'Processing Log'

    # Styles
    font_title = Font(name='Aptos Narrow', size=26, bold=True)
    font_hdr   = Font(name='Aptos Narrow', size=18, bold=True)
    font_date  = Font(name='Aptos Narrow', size=18, bold=True)
    align_ctr  = Alignment(horizontal='center', vertical='center')
    thin       = Side(style='thin')
    border     = Border(top=thin, bottom=thin, left=thin, right=thin)
    thick_bot  = Border(
        top=thin, bottom=Side(style='medium'), left=thin, right=thin
    )

    # Column widths (match original)
    col_widths = {
        'A': 5, 'B': 8.57, 'C': 17, 'D': 5,
        'E': 10, 'F': 10, 'G': 10, 'H': 10.29, 'I': 11.14
    }
    for col, width in col_widths.items():
        ws.column_dimensions[col].width = width

    # Row 2: Title
    ws.row_dimensions[2].height = 34.5
    ws.merge_cells('B2:H2')
    ws['B2'] = f'>>> {station} {month_name} Processing Log <<<'
    ws['B2'].font      = font_title
    ws['B2'].alignment = align_ctr

    # Row 4: Headers
    ws.row_dimensions[4].height = 24
    ws.merge_cells('A4:C4')
    ws.merge_cells('E4:I4')
    ws['A4'] = 'DATE'
    ws['E4'] = 'Processor'
    for cell in [ws['A4'], ws['E4']]:
        cell.font      = font_hdr
        cell.alignment = align_ctr

    # Row 5: spacer
    ws.row_dimensions[5].height = 24

    # Data rows — grouped by week with blank separator rows
    current_row = 6
    last_week   = None

    for d in weekdays:
        week_num = (d.day - 1) // 7

        # Blank separator row between weeks
        if last_week is not None and week_num != last_week:
            ws.row_dimensions[current_row].height = 24
            current_row += 1

        last_week = week_num

        ws.row_dimensions[current_row].height = 24

        # Merge date cells A:C and processor cells E:I
        ws.merge_cells(f'A{current_row}:C{current_row}')
        ws.merge_cells(f'E{current_row}:I{current_row}')

        date_cell = ws[f'A{current_row}']
        proc_cell = ws[f'E{current_row}']

        date_cell.value     = fmt_day(d)
        date_cell.font      = font_date
        date_cell.alignment = align_ctr

        # Apply borders to all cells in the row (A–I)
        is_friday = d.weekday() == 4
        row_border = thick_bot if is_friday else border

        for col_idx in range(1, 10):  # A=1 to I=9
            cell = ws.cell(row=current_row, column=col_idx)
            cell.border = row_border

        # Processor cell style
        proc_cell.font      = font_date
        proc_cell.alignment = align_ctr

        current_row += 1

    # ── Stream to browser ─────────────────────────────────────────────────────
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f'GPD_{station}_{month_name}_{year}_ProcessingLog.xlsx'
    response = make_response(send_file(
        buf,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    ))
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print('\n  GPD Warehouse Ops running at http://localhost:5000\n')
    app.run(debug=False, port=5000)