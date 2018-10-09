/*Custom Javascript File////////////////////////////////////////////////////////*/
/*Author: Pranshu Gupta*/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//This will add the smooth scrolling feature
$(function() {
  // This will select everything with the class smoothScroll
  // This should prevent problems with carousel, scrollspy, etc...
  $('.smoothScroll').click(function() {
    if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
      if (target.length) {
        $('html,body').animate({
          scrollTop: target.offset().top - 50
        }, 500); // The number here represents the speed of the scroll in milliseconds
        return false;
      }
    }
  });

});

$('#hiddenProj').slideUp();
function hiddenProjToggle() {
  $('#hiddenProj').slideDown();
  $('#hiddenProjToggle').slideUp();
}

$('#hiddenArt').slideUp();
function hiddenArtToggle() {
  $('#hiddenArt').slideDown();
  $('#hiddenArtToggle').slideUp();
}
