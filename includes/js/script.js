/*Custom Javascript File////////////////////////////////////////////////////////*/
/*Author: Pranshu Gupta*/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
$(
	function() {
		var body = $('body');
		if (Modernizr.mq('(max-width: 767px)')) {
		    body.addClass('menu');		    
		}
		$('.menu-toggle').bind('click', function() {
			body.toggleClass('menu-open');
			return false;
		});
})
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
$('#submenu1').hide();
$('#submenu1_toggle').bind('click', function() {
	if ($('#submenu2')) {$('#submenu2').slideUp();};
	if ($('#submenu')) { $('#submenu').slideUp(); };
	$('#submenu1').slideToggle();
});
$('#submenu2').hide();
$('#submenu2_toggle').bind('click', function() {
	if ($('#submenu1')) {$('#submenu1').slideUp();};
	if ($('#submenu')) { $('#submenu').slideUp(); };
	$('#submenu2').slideToggle();
});
