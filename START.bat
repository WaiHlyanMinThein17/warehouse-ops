@echo off
echo.
echo  GPD Warehouse Ops
echo  Starting server...
echo.

pip install -r requirements.txt -q

echo  Server running at http://localhost:5000
echo  Opening browser...
echo  (Keep this window open while using the app)
echo.

start http://localhost:5000
python server.py

pause