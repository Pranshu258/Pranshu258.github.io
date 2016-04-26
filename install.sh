# Git
sudo apt install git
git config --global user.name "Pranshu Gupta"
git config --global user.email "pranshug258@outlook.com"
# Themes
sudo apt install unity-tweak-tool
sudo apt install gtk-theme-config
sudo add-apt-repository ppa:numix/ppa
sudo apt update
sudo apt install numix-gtk-theme numix-icon-theme-circle
sudo apt install numix-wallpaper-*
# zsh
sudo apt install zsh
sh -c "$(wget https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh -O -)"
# vlc
sudo apt install vlc
# sublime text
sudo add-apt-repository ppa:webupd8team/sublime-text-2
sudo apt update
sudo apt install sublime-text
# deluge torrent client
sudo apt install deluge
# gnuplot
sudo apt install gnuplot
sudo apt install gnuplot-x11
sudo apt update
# gimp image editor
sudo apt install gimp
# xclip
sudo apt install xclip
# chrome
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add - 
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
sudo apt-get update 
sudo apt install google-chrome-stable
# lamp stack
sudo apt install lamp-server^
# haskell
sudo apt install ghc
# spotify
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys BBEBDCB318AD50EC6865090613B00F1FD2C19886
echo deb http://repository.spotify.com stable non-free | sudo tee /etc/apt/sources.list.d/spotify.list
sudo apt-get update && sudo apt-get install spotify-client
# tlp energy manager
sudo apt install tlp tlp-rdw
sudo tlp start
# oracle java
sudo apt-get install python-software-properties
sudo add-apt-repository ppa:webupd8team/java
sudo apt-get update
sudo apt-get install oracle-java8-installer
sudo update-alternatives --config java
# vim
sudo apt install vim
# julia lang
sudo apt install julia
# python3 modules
sudo apt install python3-numpy
sudo apt install python3-dev
sudo apt install cython
sudo apt install python3-scipy
sudo apt install python3-pip
pip3 install -U scikit-learn
pip3 install Theano
pip3 install ply
sudo apt update
# octave
sudo apt-get install octave
# opencv
sudo apt install build-essential
sudo apt install cmake git libgtk2.0-dev pkg-config libavcodec-dev libavformat-dev libswscale-dev
sudo apt install python-dev python-numpy libtbb2 libtbb-dev libjpeg-dev libpng-dev libtiff-dev libjasper-dev libdc1394-22-dev
sudo apt install libatlas-base-dev gfortran 
git clone https://github.com/Itseez/opencv.git
cd opencv
git checkout 3.1.0
git clone https://github.com/Itseez/opencv_contrib.git
cd opencv_contrib
git checkout 3.1.0
cd ~/opencv
mkdir release
cd release
cmake -D CMAKE_BUILD_TYPE=RELEASE -D CMAKE_INSTALL_PREFIX=/usr/local -D INSTALL_C_EXAMPLES=OFF -D INSTALL_PYTHON_EXAMPLES=ON -D OPENCV_EXTRA_MODULES_PATH=~/opencv_contrib/modules -D BUILD_EXAMPLES=ON ..
make -j4
sudo make install