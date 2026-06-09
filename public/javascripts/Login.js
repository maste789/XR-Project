$(".warning_code").hide();


function enter_xrpage(){
    var id = "";
    var pw = "";
    var overlap = false;
    if($(".id_input").val() != ""){
        console.log($(".id_input").val());
        $.ajax({
            type : "GET",
            url : "https://xr.k-bridge.co.kr/channel/match",
            data : {
                code : $(".id_input").val(),
            },
            async : false,
            success : function(data){
                console.log(data);
                overlap = false;
                id = $(".id_input").val();
            }, error : function(err){
                if(err.responseText == "not matched"){
                    overlap = true;
                    id = $(".id_input").val();
                }
                console.log(err);
            }
        });
    }else{
        alert("입장코드는 빈칸일수없습니다.");
        return;
    }
    
    console.log(id);
   console.log(overlap);
    if(overlap == true){
        $(".id_warning").show();
    }else{
        $(".id_warning").hide();
    }
    
    var engNum =  /^(?=.*[a-zA-Z])(?=.*[0-9]).{8,25}$/;


    // console.log(engNum.test($(".pw_input").val()));
    if($(".pw_input").val() != "" && $(".pw_input").val().length > 7 && engNum.test($(".pw_input").val())){
        pw = $(".pw_input").val();
        $(".pw_warning").hide();
    }else{
        alert("비밀번호를 확인해주세요.");
        $(".pw_warning").show();
        return;
    }

    $.ajax({
        type : "GET",
        url : "https://xr.k-bridge.co.kr/channel/match",
        data : {
            code : id,
            password : pw,
        },
        async : false,
        success : function(data){
            console.log(data);
            sessionStorage.setItem("code" , data.code);
            location.href = "../main_page.html" ;
        }, error : function(err){
            if(err.responseText == "not matched"){
                $.ajax({
                    type : "POST",
                    url : "https://xr.k-bridge.co.kr/channel",
                    data : {
                        code : id,
                        password : pw,
                    },
                    async : false,
                    success : function(data){
                        console.log(data);
                        sessionStorage.setItem("code" , data.code);
                        location.href = "../main_page.html" ;
                    }, error : function(err){
                        console.log(err);
                    }
                });
            }
            console.log(err);
        }
    });


    


}


$(".warning_code").hide();


function enter_mobiexrpage(){
    var id = $(".id_input").val();
    var pw = $(".pw_input").val();
   
    if(id == ''){
        $(".id_warning").show();
    }else{
        $(".id_warning").hide();
    }


    $.ajax({
        type : "GET",
        url : "https://xr.k-bridge.co.kr/channel/match",
        data : {
            code : id,
            password : pw,
        },
        async : false,
        success : function(data){
            // console.log(data);
            sessionStorage.setItem("code" , data.code);
            location.href = "../webview_page.html" ;
        }, error : function(err){
            if(err.responseText == "not matched"){
                $(".pw_warning").hide();
                $(".id_warning").show();
            }else{
                $(".id_warning").hide();
                $(".pw_warning").show();
            }
            console.log(err);
        }
    });


    


}
