pm2 start app.js --name vircosa
pm2 save
pm2 startup
sudo systemctl restart nginx
