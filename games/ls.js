/* ================================================================
   KLEURBUISJES – glass tubes with layers of coloured liquid. Tap a tube, tap another: the top colour pours over
   (onto the same colour or into an empty tube, as much as fits). Sort every colour into a tube of its own.
   120 levels + a daily puzzle, all checked by an exact solver (always solvable without help).
   ================================================================ */
const Kleurbuisjes = (() => {
  const LEVELS = {"levels":[{"t":["aabb","bbaa",""],"u":4,"m":3,"s":"acbabc","tip":"tap"},{"t":["cbac","abbc","acab","",""],"u":4,"m":10,"s":"adbdcbcacdacaeadbebc","tip":"rule"},{"t":["cccb","aabc","abab","",""],"u":4,"m":7,"s":"adbabdcdcbcdbc"},{"t":["cabd","bdcd","cada","bbca","",""],"u":4,"m":13,"s":"decebcbdcbcedcbfafabaeacbd"},{"t":["adcc","dcad","abdb","bbac","",""],"u":4,"m":11,"s":"aebadebdbeabdacdcbcdac"},{"t":["ccdb","badc","ddab","aacb","",""],"u":4,"m":10,"s":"aecedebdabdacdbcbdbe"},{"t":["ecab","dbdb","dcda","ceca","aeeb","",""],"u":4,"m":16,"s":"afbfcabcbfcbefegaeacagdedcdgcdbc","tip":"tools"},{"t":["ebaa","bced","ebac","bacd","ddec","",""],"u":4,"m":15,"s":"efcfcgagaceabebabfbcdedfdgcdac"},{"t":["bcbb","aead","ddcd","eeba","acce","",""],"u":4,"m":14,"s":"bfcfdbagdgedeabebdbecbabagcf"},{"t":["eecd","ddca","beeb","ccba","aadb","",""],"u":4,"m":12,"s":"dfbfedaebaebefdeadcecace"},{"t":["ccfc","fdba","abde","deae","eafd","fbbc","",""],"u":4,"m":19,"s":"agfgbhbfebeaehcecbdedhdebdabagcachfabf"},{"t":["feab","dcba","dcda","ceeb","cfeb","adff","",""],"u":4,"m":18,"s":"agcadgegedfefcafbfbgahdhbdcbcdbceade"},{"t":["afee","dcbd","ddbe","bfcf","abae","fcca","",""],"u":4,"m":17,"s":"agcgdaegfedfadeacebcbebhbcfhdfedae"},{"t":["bcdd","cefa","fcfb","beea","dbea","fdac","",""],"u":4,"m":18,"s":"dgbgegedcecbfcfgafaceafebfbhcbcfdhad"},{"t":["eacb","fdfc","edcf","bbda","adca","fbee","",""],"u":4,"m":18,"s":"bgcbcgchfcafagdadheaegehaeacfdbfbhbf"},{"t":["dafd","cbde","aaee","abfc","bcbf","decf","",""],"u":4,"m":18,"s":"egfgdfdgedfebfabagchacbabdebdecdfhaf"},{"t":["fdda","bfeg","dbgc","aegf","dcae","cebb","cagf","",""],"u":4,"m":21,"s":"bhebaebidbdhdiedcechfcfiefaebacbcegaghgdfg"},{"t":["bfdg","gabf","ccfd","cadb","dbae","fece","agge","",""],"u":4,"m":21,"s":"ghagcabcdbehfhdiaicafcedbebdfhafeaeigbdgcd"},{"t":["gfce","bfgf","acdc","daag","cdge","bbde","feab","",""],"u":4,"m":21,"s":"ahcaehfhcfacbabeabdaeafegfgdghbgbfcbdcedbe"},{"t":["dabb","cgfg","cbgc","ecad","adee","fged","fbfa","",""],"u":4,"m":22,"s":"ehdefefhbffibfbicbciacadeadedbdhgegfgdcdbcfg"},{"t":["fgge","aaab","cfcd","ecda","efgc","bdbd","fbge","",""],"u":4,"m":20,"s":"checfhbfdbdhcdeicedcadaiaegdgifgfhgfegde"},{"t":["caae","gceb","dafb","feda","bbgd","gccg","effd","",""],"u":4,"m":19,"s":"bhchdigdcgcidcdbecfegdagaibgbaebehfabf"},{"t":["hcfe","ffda","cbca","aeeh","cgea","dbhd","dbbf","ghgg","",""],"u":4,"m":22,"s":"aigagjfgdfdibdbgabcdacedeifafjfghehaehcecjce"},{"t":["gcaf","bcfe","hbee","gabd","hfdh","hgdc","fade","cagb","",""],"u":4,"m":26,"s":"biabcigidgcdecejbefbfjgjagbadbhbhfhgahfacfdcadgcegef"},{"t":["cedh","cgae","bbbc","cddf","hfee","aaab","fhfg","gghd","",""],"u":4,"m":19,"s":"bieidehddjcdfcbfgbgeghegaeajaiadhebhbd"},{"t":["abhd","faga","egdh","fbeg","aehd","gcfe","cbhc","cfbd","",""],"u":4,"m":27,"s":"aicacidceifdhiajejdehafhgfgjgdfgcfecbebfbehbghdgagaebd"},{"t":["ghfe","dbcc","faga","fbae","ahdf","ghcg","bdbc","dhee","",""],"u":4,"m":25,"s":"aidicdeafcgfhibjbgfjebefdefhcfceacgdgbdgcdhcacafbh"},{"t":["gage","ehah","adfh","fgdb","echc","dgbb","fbfa","cced","",""],"u":4,"m":24,"s":"difihdahfadfadgabjbabjcjcgcfacdagdgidghbehejehbe"},{"t":["cfca","bdhd","gche","afbg","eeec","dbfb","ahgf","ghad","",""],"u":4,"m":25,"s":"figfdgdifdfibfhfaheacecbacajcadjgcbgbfbihdhbchgbdg"},{"t":["dacb","bbae","fdae","cfcd","ffad","cbee","",""],"u":4,"h":["1100","1100","1100","1100","1100","1100","",""],"m":17,"s":"fgafbgcgbcfbafcadcdfecahcacdehdedf","tip":"hid"},{"t":["cdge","gedh","ggab","fach","acec","fbfa","bedd","hhfb","",""],"u":4,"m":23,"s":"giaggjcgfchgfhfghfbhbibjabaidhdacdbceaejeadedf"},{"t":["egea","ddhc","efdb","bfbg","facc","aeha","ghhd","bgfc","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":23,"s":"bieiaefefbfaefhihedhcdgcbjcbceacahacgjhgdhdedh"},{"t":["chgd","ffeb","gaed","bbge","faeb","dchc","gdfa","hach","",""],"u":4,"m":25,"s":"aicidcdabdedbecjejgcgbgiaghafhfahfhcahfaficfcgefbe"},{"t":["dgbb","agac","hdge","ffee","cacg","bbda","dhfh","cfeh","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":22,"s":"diciecbefbcjcfgcgdgcfgafajaghchihdehbebjebeh"},{"t":["ghgh","dafg","bbff","bbfe","aage","ccdc","ahhe","eddc","",""],"u":4,"m":21,"s":"dieigiagaegjajbabdbgeaeghefefbefhbhicedecd"},{"t":["cfdb","ahhc","gbaf","daef","egdc","cggb","fdae","hehb","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":24,"s":"dicigdcgacfccjfcbfefaeaiafhjhbdhgdegechebhdbgdgi"},{"t":["ahhc","hgad","ebbe","baga","cgdd","ffbd","cfcg","ehef","",""],"u":4,"m":22,"s":"bidbeidebdgbagfibjabdaejfdgegfeghfchcdhchbch"},{"t":["habc","gbei","dide","fahc","icfa","ghgb","eead","ihdf","cfbg","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":28,"s":"fjifijhiekeiaeajakdedadkideibecbchcegcgkbgbjfbfabfhchaeh"},{"t":["bdei","ghda","gdhh","fcfe","iadb","cgcb","fiia","hbge","aefc","",""],"u":4,"m":28,"s":"ejfjifdkdifdhkhfhjchecbebcbhfbdfgeagakidikeigedgadajcdbc"},{"t":["cedc","ifeb","edah","bbie","fhgg","gbag","ccdh","fiai","dafh","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":27,"s":"ejcefjcfgegcagacdahdekikiehidhbdbabehbehieciacagfefdfj"},{"t":["babd","hbag","ifgd","ifid","fbcc","chee","gcaf","egda","ehhi","",""],"u":4,"m":26,"s":"ajcjbcdjhbhjchgcidbkabagbagkegeacedcdecdibfifbgfhghi"},{"t":["diae","gbah","geic","giha","ehec","fdcb","aibc","fffd","hbdg","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":28,"s":"ejaecjdabdgjfgfjhfgkgcagbgbkcaecdeibifikeicebcabdbcdfafh"},{"t":["cabc","aici","fbac","dbfh","hehd","bied","gide","fgga","efhg","",""],"u":4,"m":29,"s":"hjihfkekeiefdeieidfibfabgigkfgafajbacacjcfdcdfdkgdbdbjhgch"},{"t":["bfdi","ibhf","bbef","ehgc","hiaa","ggaa","fded","ccgh","edci","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":24,"s":"ejaefjgaiedidfhdhfihaibabdcacgbcebdegdikdigkagac"},{"t":["aecc","gdbc","bbaf","gdgf","gdbe","eefc","daaf","",""],"u":4,"f":{"4":1},"m":19,"s":"ahbhfhdfeabegicicgecbebdfiafgaegdedgde","tip":"frz"},{"t":["ggbc","hief","ecbg","beff","idih","faga","deda","chih","bacd","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":27,"s":"fjcfgjigaiacfafjbfdfdbcdicijdihdedehgebghbhdchgcegbebd"},{"t":["fdde","habb","fihg","diha","eeba","cige","ficd","gchg","bfac","",""],"u":4,"f":{"7":2},"m":28,"s":"bjdbebejaefegaigbkdbikhfhbghdgadiaijcicbfifchfhichacghcg"},{"t":["ecaa","gcgh","fffi","cfai","gieb","ibhh","dagc","eddb","behd","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":24,"s":"bjfjefhfihijieficfdfdkakdcadeaefbebdbegdgegkhgah"},{"t":["hfdb","hgai","abie","edag","gfhd","hiic","ccge","bfbe","cadf","",""],"u":4,"f":{"4":2},"m":29,"s":"cjbcgjdghjahdbadckhchachbcgbfgfkedefeabebfibabafiadadjicgi"},{"t":["edec","digc","gbff","ehhd","hdeh","gcig","fcii","faba","bbaa","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":25,"s":"ijhjhihjchcifcfkgkagbgbcbkdbedaeabeaebdeadgafacfgh"},{"t":["ehhb","aagh","ddgg","bdea","ficg","ifdi","fcai","hfee","cbcb","",""],"u":4,"f":{"7":2},"m":25,"s":"ajbaebijieijeifegedgckbkfcgbgifgefegdedcdjhehgahae"},{"t":["ahfi","ijhc","ggij","dbfc","ffhb","eigj","aajd","ebhe","deac","bgdc","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":30,"s":"jkbkdkgjcgacikdaedebaebafbaliahihldhjdfjcfjchjihdigdagbdfbfh"},{"t":["ddah","ihef","aebf","eiff","bcej","cbgh","hjcj","cjda","badg","gigi","",""],"u":4,"f":{"6":2},"m":30,"s":"dkbkckjdelbeabfbhajfjdfjcfecijglegefhihlghglbgdbcdaciaicfifh"},{"t":["eeej","dfia","ffji","bcdi","dbig","cbcf","acha","hggd","jaeh","jbgh","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":28,"s":"ekdehdhkihjhjkelclacejdeiabiblfbdfgighfgfdgfigcibcbejdij"},{"t":["cefe","bigd","dgcf","hhid","gahh","ajbe","facg","jdjj","efai","cbib","",""],"u":4,"f":{"3":2},"m":29,"s":"akcafkjfijjlfjhfbhgbcgbcbljbgjigaiakajdhdledegcehcfhgfigik"},{"t":["ehac","fied","gfhe","ceag","fifi","ijaa","bddh","jjgd","hcbb","jbcg","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":28,"s":"hkbkdhdldbadalflgagkigidaibacaciebcehcfhbfebefbejcjdjghj"},{"t":["bcej","djhg","diid","cidc","ifjh","hafc","ffhj","beea","ebga","ggba","",""],"u":4,"f":{"6":2},"m":28,"s":"jkhkikbiebaeahdacdfaelfefkbfbldbcdbcglgfegdeadjaijiahiah"},{"t":["dcdbe","ffecf","becae","aaadd","cbbab","fcdef","",""],"u":5,"m":21,"s":"agcgeaecaebhfhfgafabdacdbcbgbhfacfcgecfefh","tip":"u5"},{"t":["gbdgc","ecgee","ffbcd","afbga","bafce","ddagc","abfde","",""],"u":5,"h":["11110","11110","11110","11110","11110","11110","11110","",""],"m":27,"s":"ehaebhabcafcfbdfghgaeiciegefcegcgefgafaebabibhdadedcdg"},{"t":["abacd","ggfcg","bfadc","deaee","fcddc","bbfgb","fgaee","",""],"u":5,"m":25,"s":"dhghdgdhadeaedaeagfabfcbcdbieibefbfeafcacecfgagbeg"},{"t":["daede","dbfed","fgaff","bcbcf","cgcgg","bdaea","cbgea","",""],"u":5,"h":["11110","11110","11110","11110","11110","11110","11110","",""],"m":29,"s":"ahbabhcbfcfhcfeccibcdcdebdabahgaghgidgdegdegeiegaeabfefbdf"},{"t":["edcgc","ggabf","dgaeb","bdada","deefe","cfbfc","bafgc","",""],"u":5,"m":29,"s":"ahfhbfcbecghgafgbfdbgieicecbacahadeadedgdefdfifhbfcbcegfdg"},{"t":["fedge","dffda","cgagg","fefbg","beacb","cdcac","bebad","",""],"u":5,"h":["11110","11110","11110","11110","11110","11110","11110","",""],"m":29,"s":"chbcdhedfegbfgefcechfcbfgidgeidbadahafeageagbafbcfdcadgceg"},{"t":["babba","gddga","dgecb","adfef","cfcag","efcec","dbefg","",""],"u":5,"m":28,"s":"ahbhcaebehecdeeicecdbcfegcgifgfefidfdibdcbcdgfagahgadgdh"},{"t":["ecaec","cgfch","bfhhe","bdaca","hdgfe","aggde","dadbb","bhfgf","",""],"u":5,"h":["11110","11110","11110","11110","11110","11110","11110","11110","",""],"m":32,"s":"eicibcabaidafihehjehejfefjafbadadfdegdgegfegcebcbjabaicacdhahedh"},{"t":["ddcgd","dgacf","heefb","hhfba","efbbg","cbghc","gdcfe","aahea","",""],"u":5,"f":{"0":1},"m":29,"s":"cibcfbcjgcgjbgdbdidjfdefeiejcecdhbhehdbhfbfigfagabafgabgab"},{"t":["gbabg","hfbde","cgdgb","hchaf","ecdhf","decha","aegff","acdeb","",""],"u":5,"m":33,"s":"eidifdefgiagcacgcegcbgbeabdafdhjbjbidbfdfgefdebdhghfehgeagajcahcgh"},{"t":["geeee","cgfdg","cdhba","fhbgb","cebhd","aaahf","dcaff","hbdcg","",""],"u":5,"h":["11110","11110","11110","11110","11110","11110","11110","11110","",""],"m":28,"s":"aibaebhadjdadjdefdgdcgcjcfbcbdbahbhchjehejeibefhgfgecgce"},{"t":["bfhee","bcfgc","fefhh","ahcgb","agbac","fdadd","dbgec","dghea","",""],"u":5,"f":{"5":2},"m":33,"s":"bieigihehgchhjbhcbacajbabidbdhdidjedbecbaceagbgegafgfdfgcfhcecdegh"},{"t":["gabae","dbgef","hechg","fbade","bfddd","hgacg","hfbcc","achfe","",""],"u":5,"m":31,"s":"aidihibhbicbfbfjafgjagafbabgdbebhechcjcihchjdhfhfacfgdegdegdfg"},{"t":["aghgf","dcagb","afabd","bgdfh","echcc","edeee","fbcgd","bhfha","",""],"u":5,"h":["11110","11110","11110","11110","11110","11110","11110","11110","",""],"m":32,"s":"eideadejeifecfbcabajbagfgagicgcbdcdfhbhjhchjghcgbcbifbefaeacdedh"},{"t":["cefd","dgfh","fagc","bbab","hgge","c","hab","deed","fach","",""],"u":4,"n":[6],"m":25,"s":"cfejceekbeieifcibcbkabacajafhbhjbhgadadgadiacigage","tip":"nar"},{"t":["aagj","hcaa","jcbd","idee","jhgb","efci","bgfj","hefg","dbhd","fiic","",""],"u":4,"f":{"0":2},"m":28,"s":"jkfjfkhlhfdhcdecelidiecickgcgfgligdiacalbabkbejdfjhfehce"},{"t":["fjhg","eibh","gdai","cfgg","dja","eifa","j","babi","jehc","ched","dfcb","",""],"u":4,"n":[4],"m":32,"s":"hlclecegjefmcmceacbadcdfhbhmbhblbjidkhkdfkfljfajagkaekjbdjibifgi"},{"t":["jdci","eabi","adaa","hfbf","deec","ggjb","jfhi","cbid","efgc","hhgj","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":29,"s":"akbkiafbgkjfijdiblcbdlidhchkhlahaceheicebcbifajfgjdbdjgbag"},{"t":["fgab","edfj","chea","ccbe","djfi","jfga","ibdh","hhia","c","jgd","egib","",""],"u":4,"n":[9],"m":31,"s":"hlcldcadalehflfaefbebfjbjaejbecbgcgedgdigdhgchcikdkgkcacbkfajf"},{"t":["cbgh","dcba","geeh","cdjb","jijc","agfh","fabf","ejgf","aedd","iiih","",""],"u":4,"f":{"3":2},"m":29,"s":"akckfkgfjkilicbigbgifgafhgdahfdhdledehejhechfcfibfafabbdbl"},{"t":["gich","dieb","gdjd","ehi","ghha","e","acjb","ibjj","ccaf","daff","efgb","",""],"u":4,"n":[3],"m":30,"s":"hlbhbfdbadghglgaegkmhmbhcbclcbkcikigaiahackafkjajgbjebcedbdk"},{"t":["dgcc","gaaf","jejd","fjgc","ibbg","jiie","bedb","edia","hhhc","ffah","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":25,"s":"akdkikdaeagecgcdfcjihjhfghgcegfedfbdblabhachcfjldj"},{"t":["ifcg","aegg","hchg","eebj","dbch","aabf","ddei","jbj","d","iicf","jfah","",""],"u":4,"n":[7],"m":30,"s":"alblclkcjmajamfmgabgkbkmdkdfgdgihkegcgeceheijeajcecghafabfhk"},{"t":["idbcf","ibgab","eadhd","adeab","efbce","cahig","fdihg","hcfge","fhcgi","",""],"u":5,"m":39,"s":"djbjdbedhdfhifgiikeiejaeaiajhkheihgifgfibfbkbjgbcgcicgcfdcdgfdhfiheiceacabgcgi"},{"t":["ageeb","fhdfh","idcga","hbfdi","cfhcb","dgaeg","cbece","iiihd","gaabf","",""],"u":5,"h":["11110","11110","11110","11110","11110","11110","11110","11110","11110","",""],"m":34,"s":"ajejgaegbeibijcifcakcafkfiafgcgkgjcghchedhdcbdbcebdedjbdebegiaficfch"},{"t":["c","feffb","dbeee","hiicg","ibcgf","ddghf","aahbc","diah","haaeg","cgidb","",""],"u":5,"n":[7],"m":33,"s":"gabgfbhfjkgkfgdfdaifelblibhihdjhjdejeaekdegdigdibdblcdckchjbajfbhf"},{"t":["cgfch","ggcfb","eafih","aaidh","dbbgc","ciiad","eafdb","bdegh","ifeeh","",""],"u":5,"f":{"5":1},"m":33,"s":"ajcjdjeahjheijhihdbhghfgbkabakeaehdecdckcfgegkfgdfgdcgigikfibfabaf"},{"t":["cbdfg","iidhg","hbibf","abdha","eegce","dccaf","gfdhh","igice","fbeaa","",""],"u":5,"m":34,"s":"djijeihiehaebebdfafjhfgkdkgbagabcgacfabfdfcdcbhbehieicgihgbhdbcbckdj"},{"t":["daacg","hbfhf","baegc","bhgie","achag","hefbi","ddige","diidb","ffcce","",""],"u":5,"h":["11110","11110","11110","11110","11110","11110","11110","11110","11110","",""],"m":35,"s":"djfdgjagcaechfijakeaikbibebifbfifjefekaehadhcdcjcebcbfgbdbdfcdgcaghcgh"},{"t":["diccb","efiie","eagdb","bhdaa","bedcg","hfabe","g","higgh","fcfd","icafh","",""],"u":5,"n":[8],"m":35,"s":"egekiedldehdhgjdijikjijljkhjdhadakajcdcacgclbcbjbibceaecdefcfeflfbfhib"},{"t":["eahaf","defbb","dbcag","hdgif","hdbci","fbeig","cfhci","chaae","dgeig","",""],"u":5,"f":{"6":1},"m":38,"s":"ijcjfjfihfchekecbeabdbdkdjikifijgkgcidaiagaifahighbgbadbhdchfcgfhgchbcehecde"},{"t":["icja","beke","adh","bbie","ifcg","dikf","fgbc","akgc","dkgh","a","hfej","hdjj","",""],"u":4,"n":[2],"h":["1110","1110","110","1110","1110","1110","1110","1110","1110","0","1110","1110","",""],"m":37,"s":"ajkabkamlmhaeheafebfkbkeckclcjikichcihliklhkfkhjdhbhdfbdgbabfafigdcfgfegae"},{"t":["gdga","bkji","bjfa","ifke","jjek","hbhe","dhcg","fidc","chaf","ikde","bgca","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":35,"s":"alclgahgkljmdmedemfmhjbhbedbdchdchceihilfifcifgigfjgkiakagkackjcbcbkdj"},{"t":["bffi","ahak","chdj","a","ehi","iedd","beck","kgbc","jiaj","ggeg","chfb","kjfd","",""],"u":4,"n":[4],"m":34,"s":"fmlmlnclcmilidaianeicehchajhfjifkaknekjehjbhbdghgclihlkhbhbdckgbageb"},{"t":["gcef","gihh","ahfi","fjag","cbih","bckf","igjd","dcjb","kead","jeak","kedb","",""],"u":4,"f":{"3":1},"m":35,"s":"elblcbfcebhejfkegkhgamcmcljcajhaihickhikfifaefaedadcgdgabgabkaikjadjdm"},{"t":["iae","ccka","gghf","jcab","ijbd","efak","kfgb","bgcd","hifi","hedk","h","jedj","",""],"u":4,"n":[0],"h":["110","1110","1110","1110","1110","1110","1110","1110","1110","1110","0","1110","",""],"m":34,"s":"hmemgecnckgcgnfgjgjmajbabghbhcdhehfdfnjfjklelmlfelieinieikaiaedidbdl"},{"t":["kckb","ckfa","addf","bcgi","dghe","iehj","achh","iiaj","bgke","gbfj","edjf","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":33,"s":"hlbhcbfljlkjklkcekefikjmajaibmibeicehcdhdiadbadbjdijdifdfkfhgdgbcg"},{"t":["ghf","facj","hhec","iibd","c","dkda","hjag","jkba","eebj","gikf","ifke","gcbd","",""],"u":4,"n":[0],"m":34,"s":"cekchmfmlflhleglgmbgbebmabigjbhnkhinciacalkbdadndkfajfjkjlhdfdafghcg"},{"t":["hfbe","akdf","daij","fgkh","ibcb","iakg","figh","cdgc","kehd","cbee","jajj","",""],"u":4,"f":{"4":1},"m":35,"s":"aljlajbaibdifmdfdmadgagmiaejhehmbhfbilbifbgfdgcdcfcbhcehkdkbdkedefjdhj"},{"t":["bedcd","eihbi","gccaf","aajeb","ijfhc","jhfgj","icedf","jagbg","fehid","dgabh","",""],"u":5,"f":{"2":2},"h":["11110","11110","11110","11110","11110","11110","11110","11110","11110","11110","",""],"m":41,"s":"akeaikbijebjebgegkblibilgiagakaidadifdhfhafhefdejajdhjhdehbeibcicdfiflfhcfgfegjcjk"},{"t":["icajh","bdjei","bfbfa","dcged","iibbh","gcehd","jfhag","fjcdf","ggaie","ajech","",""],"u":5,"h":["11110","11110","11110","11110","11110","11110","11110","11110","11110","11110","",""],"m":40,"s":"ikbibkelalabcahcdhdkgdgaglcgcegcbgfbflfkhbjlhfhgcheciejfjkjgajijdidfbdbcabaefbfi"},{"t":["hhjja","dfabd","hgjei","feich","gaija","ecfc","d","feagj","debfd","gbbig","cbhic","",""],"u":5,"n":[5],"m":43,"s":"bgigklckflfiflcfhcjhkmdkdldjdfidbiabebeaembebdbgjmijifgiabcbhckajgcjackgklhaeaejhedhfe"},{"t":["dadff","iihcf","cjbjf","cegeg","jiiig","bjfdh","heeea","agaga","hdjdh","cbcbb","",""],"u":5,"f":{"7":1},"m":37,"s":"ikfkfiafiablclciflficficaigahadhdgjfbjbkhdhaehebcejcjfcjdchcahiaikgididjgk"},{"t":["bcjfd","ebcfh","hfjce","jaegf","jbhdi","bigig","adaaa","dhibg","fdjeg","iecch","",""],"u":5,"f":{"2":2},"h":["11110","11110","11110","11110","11110","11110","11110","11110","11110","11110","",""],"m":40,"s":"ikfkefaedadkdigdegbehkjeblalbjhbfhfkhfehbeibiagidgadcbcacdclhcihilaiaejijbfjefde"},{"t":["gfhhf","cjjfb","fcfdb","aeecg","iacbd","ajhbg","eiece","ihgbg","jdhia","ddjia","",""],"u":5,"h":["11110","11110","11110","11110","11110","11110","11110","11110","11110","11110","",""],"m":39,"s":"dkfkhkcfecehdegdgegdflblabafbahlhkfhbfebiegidgediejdjejfcjcacbacakiahaehijfidf"},{"t":["hehcj","ibgag","ehija","fccbd","jdba","fdiaa","ibgee","dfhjd","b","egchf","figcj","",""],"u":5,"n":[4],"m":42,"s":"alklkabkebeidediadhehlahgagkgicmbmclcgchacfmfgefelhajhjabebibgkekghkfhfkdbdkjbedjdcj"},{"t":["jicga","cdaga","ijjdb","jcdaj","hffce","gaheb","chdff","dbgii","hgehf","eeibb","",""],"u":5,"f":{"1":1},"m":37,"s":"jkckfkefhjglcgdcadahaeiljafjifijhihkghfgbfbidbdhedelgedgcdacadfababhbgifei"},{"t":["kiab","fkaf","dicc","ilkd","hlfb","jdde","lehc","gbfa","ghba","hkgc","gjei","ejjl","",""],"u":4,"f":{"5":2},"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":36,"s":"imaiamhmbhbmkacnacbagnhbehebfkdfdadecdfcjnlelfklkfjkjagjglegejhehkieijik"},{"t":["jgci","fjdb","fafg","ehda","abaf","hegd","egdh","ccji","bjce","hbii","",""],"u":4,"n":[11],"m":32,"s":"akhkjkbjfbcfecdeflifiaihjigjdgdjfdfjgfbfhbahagbacbeceicebclbgbdg"},{"t":["icee","ikbe","gljf","faed","abha","cjij","clbd","lfhc","agkd","ihgl","bhjd","kgkf","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":39,"s":"dmbdgmkmgbimjgdnanedhahechlhlijlkckjbkibildihdghgafgcgchlcblfbfgafabjabjeaekei"},{"t":["dibk","hjab","ccka","hlla","gdig","kbjh","dhef","bicl","jgdg","afff","jeei","clek","",""],"u":4,"f":{"8":1},"m":36,"s":"jmcjdjgmlclgdlfdgndgedidkeknfkbfbjbkgbigdildhdhlehegieikhifhafahaiagcfcl"},{"t":["hegf","jfge","jlai","cljh","acii","acib","jeh","kbfl","hded","d","blak","ckfk","bgdg","",""],"u":4,"n":[6],"m":40,"s":"ijbimbmjbmabaniaijdigimnfmcfaoaigodghdhbhmkhlhkckdkmeafaefceckcgdkfdefbcgblclhdl"},{"t":["ijkd","cgga","bief","bfci","bedg","flia","e","eghb","kldc","jjh","hlhl","kafc","jdka","",""],"u":4,"n":[9],"h":["1110","1110","1110","1110","1110","1110","0","1110","1110","110","1110","1110","1110","",""],"m":38,"s":"mnbnebaemafnboibimkilbclcgcfhckhkihkhoghjkigaiajdadbfafgdfcdlflnilmcecehdejm"},{"t":["cebl","jggk","hjdk","lfgf","ijel","eikd","clfa","bchh","aced","kajd","ibfb","hiag","",""],"u":4,"m":37,"s":"jmfmimcfcmjcgjdggnagegeicehckaknakiaihjibjdbdnfjgdhgkhfkafagbaebeklalilkcl"},{"t":["babk","lldl","fjec","gafi","elif","jahe","bbdg","cjca","kkgi","hhhg","ecjk","fddi","",""],"u":4,"f":{"8":1},"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":33,"s":"lmdmedembeblebfeimjifjhfchcelndldfgdgnidaiagkikchkhckhekaeagfecfcl"},{"t":["gbieg","ahee","gfkhb","efjji","fiack","dcdaj","gbahd","bfihi","jdjbk","k","ceafc","gcdhk","",""],"u":5,"n":[1],"m":45,"s":"ejijcikeljhmhcdhhmhkihidlncncjildicdacfikdfkflefekemdeadamahacbdbnkbkdfkgfgnlflkclbagaghgl"},{"t":["ejkif","chcib","jekeb","ccbgh","fkfik","jddad","khajh","aaeie","abicf","hdfbg","jdggg","",""],"u":5,"f":{"5":1},"h":["11110","11110","11110","11110","11110","11110","11110","11110","11110","11110","11110","",""],"m":43,"s":"blclhchbchecjmjlajkmeaejeciejefjjkdjdmdlgjidbibdbjbdkbgkgfgjcghcfhfbkfikakagafcacfilhi"},{"t":["hihbg","jbgeh","baecf","ifegd","afdhb","jfagk","djcck","ijbcd","jckik","edafe","ahkgi","",""],"u":5,"f":{"2":2},"m":47,"s":"flafeabegliljbkikmfmklekdedmbdbmabakhehghbiailgihghaihgiegjejfjgdjcdchcjfcdfadkackbcbifbebekfi"},{"t":["gdjhf","bdkde","eejbk","i","kdchc","bbjjc","fgeik","hagfi","gbhij","aacgf","ekfh","adica","",""],"u":5,"n":[10],"h":["11110","11110","11110","0","11110","11110","11110","11110","11110","11110","1110","11110","",""],"m":43,"s":"hdahemaefmiaideiemaneacefncfcnbcbabeabgegdgcgahghajgjajmhjihifaikhkgkekcljlmldbabflajl"},{"t":["cffca","dhcdi","jakgi","chbde","edfjk","ehgje","fbdig","bahbj","ajfbg","aekig","kkhci","",""],"u":5,"h":["11110","11110","11110","11110","11110","11110","11110","11110","11110","11110","11110","",""],"m":45,"s":"ilglkgjlcjclechehigmbmbgjmcjacabkbhkcheceageigiaichighagbabkebdedbdhfefcflkdjkjeijfidiadef"},{"t":["heahd","ihcfe","cfgjj","diaba","bgjek","aifdb","h","efkii","gbkgc","cfdkb","jchd","ejgak","",""],"u":5,"n":[10],"m":45,"s":"lmdlembejdjmajagkjkgikbnbkbghbhmhnehceicimdidadbfifdfnfbafahagjdjnkjekeciecicncjlflikalahl"},{"t":["higfb","ccieg","dgejg","cbigc","hadkh","afhek","kafjb","jkbab","eaich","ddjfj","dfkei","",""],"u":5,"f":{"4":2},"h":["11110","11110","11110","11110","11110","11110","11110","11110","11110","11110","11110","",""],"m":46,"s":"alglhlbmcmgcagamkabkbadbdmdadlbdabiaidibeafeihfifafghfhlehkikhgkgfhgchcicmecefeajhjejhcjkejk"},{"t":["bfbdc","ibegb","acica","idgge","egkdf","iadjj","eheki","hkajj","kkcfh","fhhdj","cgbaf","",""],"u":5,"f":{"10":1},"m":42,"s":"jlflhlchacjaijkikhbkbmdbdmadakeaediacigcegembekbkmikgigejgajbacbckhchighegdebdfefcdf"}],"daily":[{"t":["acce","ddca","bffd","hdgb","fice","ihia","heag","bibg","ehgf","",""],"u":4,"m":26,"s":"hjdhdjcdgjbgicijbkdbidaiakeiekfaefcegagidghcfhfghfch"},{"t":["dceh","fjgc","chfi","edbe","ighi","ahbb","gfjc","dbga","jadf","eaji","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":32,"s":"ekaeckdaicjkdldiadbaflgagjcgcfaciahibhjbijbigbhghlahfaeaegekjfdj"},{"t":["edehg","acdbh","bcbff","bhded","feehc","gaacd","gafgh","gbcaf","",""],"u":5,"m":32,"s":"difiefgeagbaajadaidadidjbdbiejeacecdhefbhfhchdghgefgfhcfbfcdgbgh"},{"t":["afea","dcdc","bjia","i","ejhf","cfg","badg","hbjd","bgfc","ghjh","eeii","",""],"u":4,"n":[5],"m":31,"s":"kdilbleijeimfifmflgibgblgbagakamcacdgahbhchgehjejhijgicgciegek"},{"t":["efad","jchh","ajbg","eek","jjai","bkcg","iikd","dfie","h","bagf","bfcc","khgd","",""],"u":4,"n":[3],"h":["1110","1110","1110","110","1110","1110","1110","1110","0","1110","1110","1110","",""],"m":32,"s":"bikbjkamgmdghdehaekalmljliglhgjncnckejcefnjcjkbjbefjflfkhbabdahm"},{"t":["gldc","ihik","cjfd","hdka","kgbg","jlaj","fjde","bhce","cfbe","giha","lbfl","kaie","",""],"u":4,"f":{"9":1},"m":39,"s":"hmahgmgafgdfbdimlmlbjlcnankackgckgikighihjkhakeaeheadednjdbjbdjbajlaelfafkcfci"},{"t":["bagf","abec","cied","hfde","aieg","dgfa","dhbh","gfci","bchi","",""],"u":4,"m":30,"s":"ajeadecdckekhebhbkiegibgfbfjafabgaighihjfhdfdjgdfgefbecficai"},{"t":["djfg","bijh","fdhj","bgbc","ehaf","icea","bfie","edah","igcc","gjda","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":33,"s":"hkbkcbckjhcjecfegfdlilaiacbabgdbidgigcbgebekfeflfihbjhafhaehjfdjdg"},{"t":["gdedb","ebdeh","bhcbg","ffeed","hhacg","aahag","bgffa","cccdf","",""],"u":5,"m":27,"s":"eiciacfigfhghaehfebfajbabjcbchdjfcefcebcabajaidbgdgicg"},{"t":["fecgi","befcg","hfieh","defdd","iahdg","aabig","baghe","bhcdc","cifba","",""],"u":5,"h":["11110","11110","11110","11110","11110","11110","11110","11110","11110","",""],"m":37,"s":"bjejfjafajhahehbchgcghgjigekdkehegfefigfigdicdceicieaibibcabcahcghdgbgbhdk"},{"t":["igek","fhkg","ihic","jfag","jbdh","kibd","fcee","ghc","e","kjca","dafb","ajbd","",""],"u":4,"n":[7],"m":37,"s":"gicghgehfekflmemfecfhcbhabaiahfabfbncnackbjklaealeklkmdkdldbdehkgdbgjdjefj"},{"t":["bdif","ljaa","glke","kdck","cfal","bceg","akgc","lhbi","jeif","igdj","hbjf","edhh","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":36,"s":"amimiacidcgdfgfidfkmjkjdgjcgecdngdbgegemfekbkflklnilbicbjcajanafhjhfhkbh"},{"t":["iibf","edfc","beai","gihe","daed","dccf","gbbh","gagh","achf","",""],"u":4,"f":{"7":2},"m":27,"s":"ajfjbfbjebdeijgiagcaikdkdahkhdchecehbecbgcdgidfdefhigh"},{"t":["gcgbf","cebab","fegeb","ddeda","cfeaa","dfgda","gbfcc","",""],"u":5,"m":28,"s":"ehdhfhfdcibibhbicbcfcbacaiafebecaefafcdfgegcgiagdababedf"},{"t":["diig","bccd","jega","egbb","hfaf","jhdj","gaab","diji","ffeh","cche","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":26,"s":"ckachafhbfalfaifjijfbjdbcdgbgkdgcdhchlahideiekeifecf"},{"t":["fgbid","bghed","eiiig","fghec","aaech","iabff","bebaa","fcdcd","chdgh","",""],"u":5,"f":{"5":1},"m":34,"s":"ajbjhjdhdbedidciacdkidijikeibebkhidbfdfagfgaegfecfgcaghjhidhadahbdbg"},{"t":["jfejh","fgieh","feedb","igcii","afdhb","gchdj","jdbac","iadcg","efagh","abbcj","",""],"u":5,"f":{"1":2},"h":["11110","11110","11110","11110","11110","11110","11110","11110","11110","11110","",""],"m":41,"s":"ekaeckfafcifhighelflhfheghgkgeagjgjfjkjhcjacejeablbcdbhebhibieiaciacagfabfbcdadfdh"},{"t":["gbad","iega","cdei","fihh","jbcd","dghf","ejig","abce","acjf","bjhf","",""],"u":4,"n":[11],"m":31,"s":"ilfljlfjgfcghcjkdkgdgicgacbabfbgdbecehijhiehjehjahajfacfichild"},{"t":["cddc","ciag","gidb","hhbe","hagf","igea","cbed","aefb","ifhf","",""],"u":4,"f":{"6":2},"m":29,"s":"ijejbefbdfhdhjfhefbehkehieijibgigkcgcicbfcbfabaiabgabgdade"},{"t":["fccee","gfbgd","bbfaa","ddaea","gefac","dbbdf","ccgeg","",""],"u":5,"m":23,"s":"aheadedhcdfcbfgbghbgdieicebcebehfdfcdfgeagbabe"},{"t":["iiid","deaf","aghj","hcjg","dbbc","ecbf","aegh","hgfi","jdcj","eabf","",""],"u":4,"f":{"5":2},"m":32,"s":"ikckeigcdgdkidaihajhjeblbjhlghgbjgbjibikfleibefidbcdfbjfhjcjcgdh"},{"t":["jifh","fibg","gekd","kaac","hdgd","ckcb","efga","eceb","iijh","ajfh","jkdb","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":33,"s":"klekfldfgdegcehlkmckchbcblemaegcagabieaijejgijbigbhgfhkfjkdjfdhfgh"},{"t":["hddhd","jecc","a","daega","gfjbc","gdbfg","haajf","hiejg","iheci","bieff","ibcbj","",""],"u":5,"n":[1],"m":42,"s":"dcfdgfkgblelkeklekgecgbcebjejcijilcifcecdefkafhebmhmhdjhkjhkahafahdaiaihikdifdefgigh"},{"t":["abhfi","cdfhe","caehe","fggdg","eijba","idfbc","jbeh","c","fkaak","djhbj","djkic","ikkgg","",""],"u":5,"n":[6],"m":47,"s":"fhkhakamgacgcagcfgmfamgajgjajmgjaneaenejkeikiaikfilgdgfdefbebmbicecachdbjcbjbhkbkcjklbfldfdigf"},{"t":["eiif","ceaa","jcec","jbcg","ihdd","ibhj","fhgb","bgjh","gefa","fdad","",""],"u":4,"f":{"2":2},"m":30,"s":"jkekhefhijaibljljkijbicbcicbhcdhdbgdghfgfdafiahidhdcgdedefgj"},{"t":["echgb","cagcb","ahfbg","fhcae","fgeec","bdddd","aghab","hfdfe","",""],"u":5,"f":{"4":1},"m":30,"s":"fiafbfcacfgfebdedgbdabbjgbagdadgcdgcgjbgabeaejdehahehihechcg"},{"t":["gafi","gjch","heeg","dada","ciaj","cdhc","bedb","ehfj","igjb","ffib","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":31,"s":"jkajgkikhiahdadgeldegdilcicgbcfbfcfdbfblibjihjhcghgkagabegeief"},{"t":["jgea","bejc","hekj","ieaa","cdga","fkhh","igdb","kfcj","ghbd","kifi","dbfc","",""],"u":4,"f":{"10":1},"m":34,"s":"aldladeleaiegigeagcahakhimficfcdicgijgjkjgfjkfkmekbebahehfhjbhbmdhdg"},{"t":["gcfh","jeic","ich","lfab","ejag","i","flal","dgdc","idke","lhah","kkeb","jdfk","gjbb","",""],"u":4,"n":[2],"h":["1110","1110","110","1110","1110","0","1110","1110","1110","1110","1110","1110","1110","",""],"m":38,"s":"dnkniklimnaoalbabfcohajokbikhiehjdjogjgegjlglimlhmihfiefdfdgdjelbeblcbabamci"},{"t":["ffeb","hfhg","fbii","gdec","eehc","aadc","dibc","ahad","ggib","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":25,"s":"djejfjgjaghfdafdhfehaeckgcgkdgbdbhbahbfhifcfacikdi"},{"t":["gcjg","iaaa","degh","dibd","hfdh","ffic","agbb","eijj","cefj","cheb","",""],"u":4,"f":{"1":2},"m":27,"s":"jkgkagiaalfahlfhifjicjcgcidcdkdhcdejedefjeajgabghbihij"},{"t":["fbehb","gecce","baabe","hhdfd","acgaf","fchgg","edhdd","fgabc","",""],"u":5,"f":{"3":1},"m":29,"s":"hiahgjagbabiabcbcahahcfhfgfiefeceheiceacafdjdfdjgdgjbghbfh"},{"t":["faaaf","ibeid","hhbff","egghg","bcaic","dcdec","gebaf","ihdbe","idhcg","",""],"u":5,"m":34,"s":"ajcjgjgagchghcbhekbegbdgfkigikdidgbdcbfdfhfkhfhcehicifhiehahajekbebi"},{"t":["kfif","dcja","hajd","ijda","ieei","afbg","ccbe","bhgc","jgkg","hkkh","ebfd","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":32,"s":"aleageimfmfgflbfdfcdbchbhmjhijimcicfhcghbgdbdiadaljacjkbklkhekde"},{"t":["jefh","cfeh","gdab","ecdi","cbki","dlld","kjia","fflg","kkce","ajg","liag","j","bhhb","",""],"u":4,"n":[9],"m":36,"s":"hnjnjlgjegknkjgkglegcemebmibkodofdfkdfdibdhkbhibgimgagahadalembecacfcnja"},{"t":["agff","cdba","ecdi","fedc","gfhi","bhgc","baei","hehg","ibda","",""],"u":4,"h":["1110","1110","1110","1110","1110","1110","1110","1110","1110","",""],"m":28,"s":"ejcjgjckdcdkdgadfcfaefedaebahehfghgabgbkcbhcfhfgiaikigij"},{"t":["eddeg","ffdff","baadf","cadeb","abcgg","ecegg","bccba","",""],"u":5,"h":["11110","11110","11110","11110","11110","11110","11110","",""],"m":24,"s":"ahehfhfafeafcibicagcdgdfdacdgcegecdegdcgacafbcbi"},{"t":["gbfg","gfd","haae","hhcb","bage","deda","hfdf","b","ccec","",""],"u":4,"n":[1],"m":24,"s":"dhideiaegaajaheafefgifdickfkbfbjbagfgjdgedcdcgeh"},{"t":["dfgba","f","agaie","chicc","bceea","fdggh","bdhi","hbiif","edecd","fbgha","",""],"u":5,"n":[6],"m":36,"s":"hbckchjcecekdegdgjigieikgidlfdhlhgdhedgejhcgagaeacabiaikjcjebjfbcbfafjgc"},{"t":["hjafd","jahfc","fhidf","bjeie","gbced","ificb","agjeh","abggb","gaced","icdhj","",""],"u":5,"f":{"7":1},"m":42,"s":"akcackekdecdgcikgijgjcjkbjeliljedjdldgfdfifjafbfbcabgahdhghdbhabcafcfjifefedegihgigh"}]};
  /* ================= rules: pure logic without DOM (the level generator lsgen.mjs runs this same code) =================
     Glass tubes hold layers of coloured liquid (U units per colour, U = 4 or 5). Pour = the top run of one colour goes
     into another tube when that one is empty or has the same colour on top, as much as fits. A tube that holds all U units
     of one colour is complete: it gets a cork and stays closed. Twists: narrow tubes (room for U - 1, never complete),
     frozen tubes (closed until k tubes are complete), hidden layers ("?", shown once they come to the top).
     Level: { t: ['abca', ...] (bottom -> top, a = colour 0), u: 4|5, n: [narrow tube indices], f: { tube: k }, h: ['0110', ...]
              (1 = hidden), m: par (moves of the solver's solution), s: 'acbd..' (solution, 2 letters per pour: from, to) } */
  const colOf = ch => ch.charCodeAt(0) - 97;
  function newState(L) {
    const U = L.u || 4, T = L.t.map(s => [...s].map(colOf)), nar = L.n || [];
    const st = {
      U, T, cap: T.map((_, i) => nar.includes(i) ? U - 1 : U), frz: T.map((_, i) => (L.f && +L.f[i]) || 0),
      hid: T.map((t, i) => t.map((_, j) => !!(L.h && L.h[i] && L.h[i][j] === '1'))),
      nc: new Set(T.flat()).size, done: 0, extra: false, won: false,
    };
    st.done = countDone(st); reveal(st); st.won = isWon(st);
    return st;
  }
  const clone = S => Object.assign({}, S, { T: S.T.map(t => t.slice()), cap: S.cap.slice(), frz: S.frz.slice(), hid: S.hid.map(h => h.slice()) });
  const top = t => t.length ? t[t.length - 1] : -1;
  function runLen(t) { const c = top(t); let n = 0; for (let i = t.length - 1; i >= 0 && t[i] === c; i--) n++; return n; }
  const isMono = t => t.length > 0 && runLen(t) === t.length;
  const isDone = (S, i) => S.T[i].length === S.U && isMono(S.T[i]);
  const frozen = (S, i) => S.frz[i] > 0 && S.done < S.frz[i];
  function countDone(S) { let n = 0; for (let i = 0; i < S.T.length; i++) if (isDone(S, i)) n++; return n; }
  function isWon(S) { for (let i = 0; i < S.T.length; i++) if (S.T[i].length && !isDone(S, i)) return false; return true; }
  function reveal(S) {                                          // the top run of every tube is always visible
    const out = [];
    S.T.forEach((t, i) => { const c = top(t); for (let j = t.length - 1; j >= 0 && t[j] === c; j--) if (S.hid[i][j]) { S.hid[i][j] = false; out.push([i, j]); } });
    return out;
  }
  // why a pour is not possible (null = it is)
  function why(S, s, t) {
    if (s === t) return 'same';
    if (s < 0 || t < 0 || s >= S.T.length || t >= S.T.length) return 'none';
    if (frozen(S, s) || frozen(S, t)) return 'frozen';
    const A = S.T[s], B = S.T[t];
    if (!A.length) return 'empty';
    if (isDone(S, s)) return 'corked';
    if (B.length >= S.cap[t]) return 'full';
    if (B.length && top(B) !== top(A)) return 'colour';
    return null;
  }
  // pour s -> t; returns { n, c, done: [completed tubes], thaw: [thawed tubes], rev: [[tube, layer], ...] } or { err }
  function pour(S, s, t) {
    const err = why(S, s, t); if (err) return { err };
    const A = S.T[s], B = S.T[t], c = top(A), n = Math.min(runLen(A), S.cap[t] - B.length);
    for (let k = 0; k < n; k++) { A.pop(); S.hid[s].pop(); B.push(c); S.hid[t].push(false); }
    const before = S.done; S.done = countDone(S);
    const done = isDone(S, t) ? [t] : [], thaw = [];
    if (S.done > before) for (let i = 0; i < S.T.length; i++) if (S.frz[i] > before && S.frz[i] <= S.done) thaw.push(i);
    const rev = reveal(S); S.won = isWon(S);
    return { n, c, done, thaw, rev };
  }
  function legal(S) { const out = []; for (let s = 0; s < S.T.length; s++) for (let t = 0; t < S.T.length; t++) if (!why(S, s, t)) out.push([s, t]); return out; }
  // a pour that changes nothing worth having: a whole one-colour tube into an empty tube of the same kind
  const pointless = (S, s, t) => !S.T[t].length && isMono(S.T[s]) && S.cap[t] <= S.cap[s];
  const stuck = S => !S.won && !legal(S).some(([s, t]) => !pointless(S, s, t));
  function addTube(S) { S.T.push([]); S.hid.push([]); S.cap.push(S.U); S.frz.push(0); S.extra = true; }

  /* ================= solver: A* over pours with canonical states =================
     h = (number of colour runs) - (number of colours): one pour joins at most two runs, so h never overestimates and with
     w = 1 the solution is optimal. Tubes of the same kind (capacity, frozen-until) are interchangeable, so a state is
     stored sorted per kind. Returns the list of pours [[s, t], ...], or null (no solution / budget used up: res.why). */
  function solve(S0, o = {}) {
    const w = o.w || 1, max = o.max || 200000, deadline = o.ms ? Date.now() + o.ms : 0;
    const n = S0.T.length, U = S0.U, cap = S0.cap, frz = S0.frz;
    const kind = cap.map((c, i) => c + (frz[i] ? 'f' + frz[i] : ''));
    const ch = t => String.fromCharCode(...t.map(c => 97 + c));
    const runsOf = T => { let r = 0; for (const t of T) for (let i = 0; i < t.length; i++) if (!i || t[i] !== t[i - 1]) r++; return r; };
    const nc = new Set(S0.T.flat()).size;
    const doneOf = T => { let d = 0; for (const t of T) if (t.length === U) { let m = true; for (let i = 1; i < U; i++) if (t[i] !== t[0]) { m = false; break; } if (m) d++; } return d; };
    const key = T => { const p = T.map((t, i) => kind[i] + ':' + ch(t)); p.sort(); return p.join('|'); };
    const start = { T: S0.T.map(t => t.slice()), g: 0, p: null, mv: null }; start.k = key(start.T);
    start.h = runsOf(start.T) - nc; start.d = doneOf(start.T);
    if (start.h === 0) return Object.assign([], { exp: 0 });
    const heap = [start], seen = new Map([[start.k, 0]]);
    const less = (a, b) => (a.g + w * a.h) - (b.g + w * b.h) || a.h - b.h;
    const push = x => { heap.push(x); let i = heap.length - 1; while (i) { const j = (i - 1) >> 1; if (less(heap[j], heap[i]) <= 0) break; [heap[i], heap[j]] = [heap[j], heap[i]]; i = j; } };
    const popH = () => { const r = heap[0], x = heap.pop(); if (heap.length) { heap[0] = x; let i = 0; for (;;) { const l = 2 * i + 1, rr = l + 1; let m = i; if (l < heap.length && less(heap[l], heap[m]) < 0) m = l; if (rr < heap.length && less(heap[rr], heap[m]) < 0) m = rr; if (m === i) break; [heap[i], heap[m]] = [heap[m], heap[i]]; i = m; } } return r; };
    let exp = 0;
    while (heap.length) {
      const N = popH();
      if (seen.get(N.k) < N.g) continue;
      if (++exp > max || (deadline && !(exp & 255) && Date.now() > deadline)) { const r = null; solve.why = 'budget'; solve.exp = exp; return r; }
      const T = N.T, d = N.d;
      const fz = i => frz[i] > 0 && d < frz[i];
      for (let s = 0; s < n; s++) {
        const A = T[s]; if (!A.length || fz(s)) continue;
        const c = A[A.length - 1]; let run = 0; for (let i = A.length - 1; i >= 0 && A[i] === c; i--) run++;
        if (run === A.length && A.length === U) continue;                       // complete (corked)
        const emptyKinds = new Set();
        for (let t = 0; t < n; t++) {
          if (t === s || fz(t)) continue;
          const B = T[t]; if (B.length >= cap[t]) continue;
          if (B.length) { if (B[B.length - 1] !== c) continue; }
          else {
            if (run === A.length && cap[t] <= cap[s]) continue;                  // pointless
            if (emptyKinds.has(kind[t])) continue; emptyKinds.add(kind[t]);     // one empty tube per kind is enough
          }
          const k = Math.min(run, cap[t] - B.length);
          const T2 = T.slice(); T2[s] = A.slice(0, A.length - k); T2[t] = B.concat(Array(k).fill(c));
          const g = N.g + 1, ky = key(T2), old = seen.get(ky);
          if (old !== undefined && old <= g) continue;
          seen.set(ky, g);
          const M = { T: T2, g, p: N, mv: [s, t], h: runsOf(T2) - nc, d: doneOf(T2), k: ky };
          if (M.h === 0) { const path = []; for (let x = M; x.p; x = x.p) path.push(x.mv); path.reverse(); path.exp = exp; solve.exp = exp; return path; }
          push(M);
        }
      }
    }
    solve.why = 'none'; solve.exp = exp; return null;
  }
  const encMoves = mv => mv.map(([s, t]) => String.fromCharCode(97 + s, 97 + t)).join('');
  const decMoves = s => { const out = []; for (let i = 0; i + 1 < s.length; i += 2) out.push([colOf(s[i]), colOf(s[i + 1])]); return out; };

  /* ================= art: colours, symbols, glass, liquid ================= */
  // rich, clearly different liquids; [base, light, dark]
  const PAL = [
    ['#ec3448', '#ff7a86', '#a3142a'],   // rood
    ['#ff8c1a', '#ffbc6b', '#c25600'],   // oranje
    ['#ffd02e', '#fff08a', '#d69a00'],   // geel
    ['#8bd63a', '#c6f57e', '#4f9a12'],   // limoen
    ['#16a35f', '#5fd99a', '#0a6a3c'],   // groen
    ['#25c8d2', '#86f0f4', '#0d8a95'],   // turkoois
    ['#3d82ff', '#8fb9ff', '#1a4fc4'],   // blauw
    ['#5a3fd0', '#9a86f5', '#33208f'],   // indigo
    ['#b04de6', '#dc9cff', '#7420a8'],   // paars
    ['#ff5fae', '#ffa6d4', '#c42777'],   // roze
    ['#9b5b2d', '#d0915e', '#623512'],   // bruin
    ['#e6e9f0', '#ffffff', '#a9b1c2'],   // wit
  ];
  const CNAME = ['rood', 'oranje', 'geel', 'limoen', 'groen', 'turkoois', 'blauw', 'indigo', 'paars', 'roze', 'bruin', 'wit'];
  const THEMES = {
    avond: { name: 'Avond', top: '#2a1f5c', mid: '#3b2a78', bot: '#120d2e', bokeh: ['#ff7ac8', '#7a8cff', '#ffcf6b', '#6be4ff'], shelf: 'rgba(190,200,255,.16)', bar: '#231a4f' },
    lagune: { name: 'Lagune', top: '#0f5f73', mid: '#11788a', bot: '#07283a', bokeh: ['#7affd9', '#6bc8ff', '#fff3a8', '#b4ffb0'], shelf: 'rgba(190,255,245,.16)', bar: '#0c4a5b' },
    perzik: { name: 'Perzik', top: '#f08a7a', mid: '#c95d7c', bot: '#4a2252', bokeh: ['#ffe2a8', '#ffffff', '#ffb0c8', '#ffd27a'], shelf: 'rgba(255,235,230,.2)', bar: '#8a3b62' },
  };
  // colour-blind help: a symbol per colour, drawn as paths around (0,0) with radius 1
  function symbol(g, k) {
    g.beginPath();
    const P = pts => { pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
    const star = (n, r1, r2, a0 = -Math.PI / 2) => { const p = []; for (let i = 0; i < n * 2; i++) { const a = a0 + i * Math.PI / n, r = i % 2 ? r2 : r1; p.push([Math.cos(a) * r, Math.sin(a) * r]); } P(p); };
    switch (k % 12) {
      case 0: g.arc(0, 0, .82, 0, 7); break;                                   // rondje
      case 1: P([[0, -.95], [.92, .7], [-.92, .7]]); break;                    // driehoek
      case 2: star(5, 1, .44); break;                                          // ster
      case 3: P([[-.3, -.95], [.3, -.95], [.3, -.3], [.95, -.3], [.95, .3], [.3, .3], [.3, .95], [-.3, .95], [-.3, .3], [-.95, .3], [-.95, -.3], [-.3, -.3]]); break;   // plus
      case 4: P([[0, -1], [.75, 0], [0, 1], [-.75, 0]]); break;                // ruit
      case 5: P([[-.75, -.75], [.75, -.75], [.75, .75], [-.75, .75]]); break;  // vierkant
      case 6: g.arc(0, 0, .9, 0, 7); g.arc(0, 0, .45, 0, 7, true); break;      // ring
      case 7: P([[-.95, -.6], [-.6, -.95], [0, -.35], [.6, -.95], [.95, -.6], [.35, 0], [.95, .6], [.6, .95], [0, .35], [-.6, .95], [-.95, .6], [-.35, 0]]); break;   // kruis
      case 8: g.moveTo(0, .9); g.bezierCurveTo(-1.3, 0, -.7, -1.15, 0, -.45); g.bezierCurveTo(.7, -1.15, 1.3, 0, 0, .9); g.closePath(); break;   // hart
      case 9: g.arc(0, 0, .9, Math.PI * .3, Math.PI * 1.7); g.arc(.35, 0, .62, Math.PI * 1.55, Math.PI * .45, true); g.closePath(); break;    // maan
      case 10: P([[0, .95], [.92, -.7], [-.92, -.7]]); break;                  // driehoek omlaag
      case 11: star(6, 1, .55, 0); break;                                      // zesster
    }
  }

  /* tube geometry in CSS px, local to the tube element (origin top-left of the element box) */
  function tubeGeom(gw, lh, cap, U) {
    const wall = Math.max(1.6, gw * .055), iw = gw - 2 * wall, r = iw / 2, rimH = Math.max(4, gw * .13), head = lh * .38;
    const pad = Math.ceil(Math.max(4, gw * .1));
    const ix0 = pad + wall, ix1 = ix0 + iw, iy0 = pad + rimH;
    const iyb = iy0 + head + cap * lh + r * (1 - Math.PI / 4);   // interior bottom (the round bottom keeps every layer about lh high)
    const gh = (iyb - pad) + wall, W = gw + 2 * pad, H = Math.ceil(gh + 2 * pad);
    // the interior polygon (open mouth along the top) for volume sums
    const poly = [[ix0, iy0], [ix1, iy0], [ix1, iyb - r]];
    for (let k = 1; k < 16; k++) { const a = k / 16 * Math.PI; poly.push([ix0 + r + Math.cos(a) * r, iyb - r + Math.sin(a) * r]); }
    poly.push([ix0, iyb - r]);
    const g = { gw, lh, cap, U, wall, iw, r, rimH, head, pad, ix0, ix1, iy0, iyb, gh, W, H, poly, cx: ix0 + r };
    g.unit = areaBelow(g, 0, iy0 + head) / cap;            // one layer of liquid
    g.room = areaBelow(g, 0, iy0);                          // everything up to the rim
    return g;
  }
  // area of the interior below the world-horizontal line at height h, with the tube turned by angle a (clockwise)
  function areaBelow(g, a, h) {
    const s = Math.sin(a), c = Math.cos(a), P = g.poly, n = P.length; let A = 0, prev = null, first = null;
    const W = p => p[0] * s + p[1] * c;                      // world "down" coordinate of a local point
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = P[i], q = P[(i + 1) % n], wp = W(p) - h, wq = W(q) - h;
      if (wp >= 0) out.push(p);
      if ((wp >= 0) !== (wq >= 0)) { const t = wp / (wp - wq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    }
    for (let i = 0; i < out.length; i++) { const p = out[i], q = out[(i + 1) % out.length]; A += p[0] * q[1] - q[0] * p[1]; }
    void prev; void first;
    return Math.abs(A) / 2;
  }
  // the height h (world-down coordinate) at which the liquid volume v (in layers) stands with the tube at angle a
  function levelFor(g, a, v) {
    const s = Math.sin(a), c = Math.cos(a); let lo = Infinity, hi = -Infinity;
    for (const p of g.poly) { const w = p[0] * s + p[1] * c; if (w < lo) lo = w; if (w > hi) hi = w; }
    const A = v * g.unit; if (A <= 0) return hi; if (A >= areaBelow(g, a, lo)) return lo;
    for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; if (areaBelow(g, a, m) > A) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  // the angle at which the volume v just reaches the lip (top-right inner corner, pouring to the right)
  function spillAngle(g, v) {
    const lip = [g.ix1, g.iy0]; let lo = 0, hi = Math.PI * .62;
    const at = a => areaBelow(g, a, lip[0] * Math.sin(a) + lip[1] * Math.cos(a)) / g.unit;
    if (at(0) <= v) return 0;
    for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; if (at(m) > v) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  function tubePath(g2, G) {
    const { ix0, ix1, iy0, iyb, r } = G;
    g2.beginPath(); g2.moveTo(ix0, iy0 - 1); g2.lineTo(ix1, iy0 - 1); g2.lineTo(ix1, iyb - r); g2.arc(ix0 + r, iyb - r, r, 0, Math.PI); g2.closePath();
  }
  // static glass: back (behind the liquid) and front (highlights over it), drawn once per tube size
  function drawGlassBack(g, G, small) {
    const { pad, gw, gh, wall, ix0, ix1, iy0, iyb, r } = G, x0 = pad, x1 = pad + gw, y0 = pad, R = gw / 2;
    g.save();
    // glass body: a faint cool tint, darker at the edges like a real cylinder
    g.beginPath(); g.moveTo(x0, y0 + G.rimH * .5); g.lineTo(x0, y0 + gh - R); g.arc(x0 + R, y0 + gh - R, R, Math.PI, 0, true); g.lineTo(x1, y0 + G.rimH * .5); g.closePath();
    const bg = g.createLinearGradient(x0, 0, x1, 0);
    bg.addColorStop(0, 'rgba(210,230,255,.22)'); bg.addColorStop(.18, 'rgba(210,230,255,.06)'); bg.addColorStop(.75, 'rgba(210,230,255,.05)'); bg.addColorStop(1, 'rgba(210,230,255,.2)');
    g.fillStyle = bg; g.fill();
    // inside: a touch darker so the empty tube reads as glass, not as a hole
    tubePath(g, G); const ig = g.createLinearGradient(ix0, 0, ix1, 0); ig.addColorStop(0, 'rgba(10,15,40,.18)'); ig.addColorStop(.5, 'rgba(10,15,40,.05)'); ig.addColorStop(1, 'rgba(10,15,40,.16)'); g.fillStyle = ig; g.fill();
    // the back of the rim
    g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(pad + R, iy0 - 1, G.iw / 2, Math.max(1.5, G.rimH * .28), 0, Math.PI, 0); g.fill();
    if (small) { g.strokeStyle = 'rgba(255,214,120,.55)'; g.setLineDash([3, 3]); g.lineWidth = 1.2; g.beginPath(); g.moveTo(ix0 + 2, iy0 + G.head * .5); g.lineTo(ix1 - 2, iy0 + G.head * .5); g.stroke(); g.setLineDash([]); }
    void wall; void iyb; void r;
    g.restore();
  }
  function drawGlassFront(g, G) {
    const { pad, gw, gh, rimH } = G, x0 = pad, x1 = pad + gw, y0 = pad, R = gw / 2;
    g.save();
    const body = () => { g.beginPath(); g.moveTo(x0, y0 + rimH * .55); g.lineTo(x0, y0 + gh - R); g.arc(x0 + R, y0 + gh - R, R, Math.PI, 0, true); g.lineTo(x1, y0 + rimH * .55); };
    // outline
    body(); g.lineWidth = Math.max(1.4, gw * .045); g.strokeStyle = 'rgba(235,245,255,.62)'; g.stroke();
    body(); g.lineWidth = Math.max(.8, gw * .018); g.strokeStyle = 'rgba(255,255,255,.55)'; g.stroke();
    // long highlight on the left, thin one on the right
    const hx = x0 + gw * .2, hw = gw * .13;
    let hg = g.createLinearGradient(0, y0 + rimH, 0, y0 + gh - R * .6); hg.addColorStop(0, 'rgba(255,255,255,.62)'); hg.addColorStop(.6, 'rgba(255,255,255,.3)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hg; g.beginPath(); g.moveTo(hx, y0 + rimH + 3); g.lineTo(hx + hw, y0 + rimH + 3); g.lineTo(hx + hw * .8, y0 + gh - R * .9); g.quadraticCurveTo(hx + hw * .3, y0 + gh - R * .5, hx, y0 + gh - R * 1.1); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(x1 - gw * .2, y0 + rimH + 6, Math.max(1, gw * .05), gh - rimH - R - 6);
    // a soft reflection in the round bottom
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(1, gw * .04); g.beginPath(); g.arc(x0 + R, y0 + gh - R, R * .7, Math.PI * .62, Math.PI * .88); g.stroke();
    // the rim: a slightly wider glass lip
    const lip = g.createLinearGradient(x0 - 2, 0, x1 + 2, 0); lip.addColorStop(0, 'rgba(255,255,255,.75)'); lip.addColorStop(.35, 'rgba(255,255,255,.35)'); lip.addColorStop(1, 'rgba(255,255,255,.6)');
    g.fillStyle = lip; rrect(g, x0 - gw * .07, y0, gw * 1.14, rimH * .62, rimH * .3); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; rrect(g, x0 - gw * .07, y0, gw * 1.14, rimH * .62, rimH * .3); g.stroke();
    g.restore();
  }
  function rrect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  /* the liquid of one tube: segs = [[colour, amount, hidden], ...] bottom -> top; a = angle; drawn in local coordinates
     (the canvas covers the interior box; ox/oy = its offset in the element). The tube's own clip keeps it inside. */
  const gradCache = new WeakMap();
  function liquidGrad(g, G, c, hid) {
    let m = gradCache.get(g); if (!m) { m = new Map(); gradCache.set(g, m); }
    const key = (hid ? 'h' : c) + '|' + G.ix0; let gr = m.get(key); if (gr) return gr;
    const p = hid ? ['#4a5068', '#6b7290', '#2c3044'] : PAL[c];
    gr = g.createLinearGradient(G.ix0, 0, G.ix1, 0);
    gr.addColorStop(0, p[2]); gr.addColorStop(.16, p[0]); gr.addColorStop(.34, p[1]); gr.addColorStop(.5, p[0]); gr.addColorStop(.86, p[0]); gr.addColorStop(1, p[2]);
    m.set(key, gr); return gr;
  }
  function drawLiquid(g, G, segs, a, o) {
    // o: { wob: amplitude px, ph: phase, cb: colour-blind symbols, bub: [[x, y, r, alpha], ...] (local), flash: [[segIndex, alpha]] }
    const s = Math.sin(a), c = Math.cos(a), L = G.H * 2, dx = c, dy = -s, a0 = G.cx * c - (G.iy0 + G.iyb) / 2 * s;   // a0: where the tube's middle is along a level line
    g.save(); tubePath(g, G); g.clip();
    let vol = 0; const tops = [];
    for (const sg of segs) { vol += sg[1]; tops.push(levelFor(G, a, vol)); }
    let hLo = -1e9;                                          // world-down coordinate of the band's lower edge (start: far below)
    for (let i = 0; i < segs.length; i++) {
      const [col, amt, hid] = segs[i]; if (amt <= 1e-4) continue;
      const hHi = tops[i], top = i === segs.length - 1 || segs.slice(i + 1).every(x => x[1] <= 1e-4);
      g.beginPath();
      // lower edge (far below for the first band)
      const lo = i === 0 ? G.H * 3 : hLo;
      g.moveTo(s * lo + dx * (a0 - L), c * lo + dy * (a0 - L)); g.lineTo(s * lo + dx * (a0 + L), c * lo + dy * (a0 + L));
      if (top && o.wob > .05) {
        const N = 14; for (let k = N; k >= 0; k--) { const u = (k / N - .5) * 2, along = a0 + u * G.iw * .8, w = Math.sin(u * 3.1 + o.ph) * o.wob * (1 - Math.abs(u) * .3), hh = hHi + w;
          g.lineTo(s * hh + dx * along, c * hh + dy * along); }
        g.lineTo(s * hHi + dx * (a0 - L), c * hHi + dy * (a0 - L));
      } else { g.lineTo(s * hHi + dx * (a0 + L), c * hHi + dy * (a0 + L)); g.lineTo(s * hHi + dx * (a0 - L), c * hHi + dy * (a0 - L)); }
      g.closePath(); g.fillStyle = liquidGrad(g, G, col, hid); g.fill();
      const fl = o.flash && o.flash.find(f => f[0] === i);
      if (fl && fl[1] > 0) { g.fillStyle = `rgba(255,255,255,${(fl[1] * .7).toFixed(3)})`; g.fill(); }
      // a bright meniscus on the top
      if (top) {
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(1.2, G.gw * .04); g.beginPath();
        const N = o.wob > .05 ? 10 : 1;
        for (let k = 0; k <= N; k++) { const u = N === 1 ? (k ? 1 : -1) : (k / N - .5) * 2, along = a0 + u * G.iw * .8, w = N === 1 ? 0 : Math.sin(u * 3.1 + o.ph) * o.wob * (1 - Math.abs(u) * .3), hh = hHi + w; const x = s * hh + dx * along, y = c * hh + dy * along; k ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      } else {                                               // a faint line between two layers
        g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1; g.beginPath(); g.moveTo(s * hHi + dx * (a0 - G.iw), c * hHi + dy * (a0 - G.iw)); g.lineTo(s * hHi + dx * (a0 + G.iw), c * hHi + dy * (a0 + G.iw)); g.stroke();
      }
      const bandTop = hHi, bandLo = i === 0 ? null : hLo;
      // symbols / question marks in the middle of the band (only while the tube is fairly upright)
      if ((hid || o.cb) && Math.abs(a) < .9) {
        const yTop = (bandTop - G.cx * s) / c, yLo = bandLo === null ? G.iyb : (bandLo - G.cx * s) / c, ym = (yTop + yLo) / 2, hgt = yLo - yTop;
        if (hgt > G.lh * .45) {
          g.save(); g.translate(G.cx, ym);
          if (hid) { g.fillStyle = 'rgba(255,255,255,.82)'; g.font = `800 ${Math.round(G.iw * .62)}px system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, G.iw * .03); }
          else { const k = Math.min(G.iw * .3, hgt * .3); g.scale(k, k); symbol(g, col); g.fillStyle = col === 11 || col === 2 || col === 3 ? 'rgba(40,40,60,.62)' : 'rgba(255,255,255,.8)'; g.fill(); }
          g.restore();
        }
      }
      hLo = hHi;
    }
    // bubbles while pouring
    if (o.bub) for (const [x, y, r, al] of o.bub) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = `rgba(255,255,255,${(al * .5).toFixed(3)})`; g.fill(); g.lineWidth = .8; g.strokeStyle = `rgba(255,255,255,${(al * .8).toFixed(3)})`; g.stroke(); }
    g.restore();
    return tops;
  }

  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* ================= settings, progress ================= */
  const LV = LEVELS.levels, DLY = LEVELS.daily, NL = LV.length;
  const opt = Object.assign({ sound: true, cb: false, theme: 'avond' }, store.get('ls.settings', {}));
  if (!THEMES[opt.theme]) opt.theme = 'avond';
  const saveOpt = () => store.set('ls.settings', opt);
  Sfx.gate('ls', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const sfx = n => { if (opt.sound) Sfx.play(n); };
  let stats = Object.assign({ played: 0, won: 0, stars: {}, best: {}, inv: null, daily: {}, dailyWon: 0, three: 0, pours: 0, time: 0 }, store.get('ls.stats', {}));
  stats.inv = Object.assign({ undo: 5, tube: 3 }, stats.inv || {});
  const saveStats = () => store.set('ls.stats', stats);
  const UNDO_FREE = 5, TIP_FREE = 3;
  const unlocked = () => { let n = 1; while (n < NL && stats.stars[n]) n++; return n; };
  const DAILY_FROM = 11, dailyOpen = () => !!stats.stars[DAILY_FROM - 1];
  const totalStars = () => Object.values(stats.stars).reduce((a, b) => a + b, 0);
  const dayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dayIdx = d => Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5) % DLY.length;
  const levelOf = id => typeof id === 'number' ? LV[id - 1] : DLY[dayIdx(String(id).slice(1))];
  const TIPS = {
    tap: 'Tik op een buisje om het op te pakken en tik daarna op een ander buisje om erin te gieten. Maak elk buisje vol met één kleur!',
    rule: 'Je kunt alleen gieten in een leeg buisje of bovenop dezelfde kleur, en nooit meer dan er past.',
    tools: 'Vast? ↶ Terug zet een zet terug, 🧪 Extra geeft je een leeg buisje erbij en 💡 Tip wijst een goede zet aan.',
    hid: 'Nieuw: verborgen lagen ❓. Hun kleur zie je pas als ze bovenaan komen te liggen.',
    frz: 'Nieuw: een bevroren buisje ❄️. Het ontdooit als er eerst zoveel buisjes klaar zijn als het getal op het ijs.',
    u5: 'Vanaf nu passen er vijf lagen in een buisje: meer ruimte, maar ook meer om te sorteren.',
    nar: 'Nieuw: een klein buisje met een gele streep. Er passen maar drie lagen in, dus het wordt nooit klaar. Gebruik het als tussenstop en maak het op het eind weer leeg.',
  };
  const WHY = {
    colour: 'Dat kan niet: bovenin moet dezelfde kleur zitten.',
    full: 'Dat buisje is al vol.',
    corked: 'Dit buisje is al klaar.',
    empty: 'Dit buisje is leeg.',
  };

  /* ================= state ================= */
  let S = null, G = null, L = null, LY = null, sel = -1;
  const scr = $('#ls'), stage = $('#lsStage'), world = $('#lsWorld'), bg = $('#lsBg'), bctx = bg.getContext('2d');
  let clk0 = 0, clkP = 0, clkK = 1;                          // the game clock (a test hook can slow it down for screenshots)
  const now = () => clk0 + (performance.now() / 1000 - clkP) * clkK;
  const finite = x => Number.isFinite(x) ? x : now();

  /* ================= layout: tubes in 1-3 rows, as big as fits ================= */
  function capOf(i) { return S.cap[i]; }
  function computeLayout(W, H, land) {
    const n = S.T.length, U = S.U; let best = null;
    for (let rows = 1; rows <= 3; rows++) {
      if (rows > 1 && n <= (land ? 8 : 4)) continue;
      const per = Math.ceil(n / rows), cellW = W / per;
      let gw = Math.min(cellW * .64, 60), lh = Math.min(gw * 1.02, (H / rows - gw * .62 - 14) / (U + 1.25));
      gw = Math.min(gw, lh / .68);
      if (lh <= 4) continue;
      const sc = gw * lh * (rows > 1 ? .97 : 1);
      if (!best || sc > best.sc) best = { rows, per, cellW, gw, lh, sc };
    }
    const { rows, gw, lh } = best, out = { W, H, land, rows, gw, lh, lift: lh * .55, slots: [] };
    // rows from the top; the first row gets the extra tube when the count is odd
    const counts = []; let left = n; for (let r = 0; r < rows; r++) { const c = Math.ceil(left / (rows - r)); counts.push(c); left -= c; }
    const rowH = H / rows, glassH = gw * .13 + (U + .38) * lh + gw * .11 + 3;
    let i = 0;
    counts.forEach((c, r) => {
      const cw = W / Math.max(c, best.per), x0 = (W - cw * c) / 2, bottom = r * rowH + rowH / 2 + glassH / 2 + lh * .3;
      for (let k = 0; k < c; k++, i++) out.slots.push({ cx: x0 + cw * (k + .5), by: bottom, cw, rowTop: r * rowH, rowBot: (r + 1) * rowH });
    });
    return out;
  }
  let fitKey = '';
  function fit(force) {
    if (current !== 'ls' || !S) return;
    const land = innerWidth > innerHeight * 1.1; scr.classList.toggle('land', land);
    const r = stage.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
    const key = [r.width, r.height, S.T.length, S.cap.join(''), S.U].join();
    if (!force && key === fitKey && LY) return;
    fitKey = key;
    LY = computeLayout(r.width, r.height, land);
    drawBg(); buildTubes(); syncVisual();
  }
  function drawBg() {
    const dpr = Math.min(2, devicePixelRatio || 1), W = LY.W, H = LY.H, T = THEMES[opt.theme];
    bg.width = Math.round(W * dpr); bg.height = Math.round(H * dpr);
    const g = bctx; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gr = g.createLinearGradient(0, 0, W * .3, H); gr.addColorStop(0, T.top); gr.addColorStop(.55, T.mid); gr.addColorStop(1, T.bot); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // soft bokeh lights (always the same for a screen size: seeded)
    let sd = 1234567 + Math.round(W) * 7 + Math.round(H); const rnd = () => { sd ^= sd << 13; sd >>>= 0; sd ^= sd >> 17; sd ^= sd << 5; sd >>>= 0; return sd / 4294967296; };
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 26; k++) {
      const x = rnd() * W, y = rnd() * H, rr = (14 + rnd() * 60) * Math.max(.7, Math.min(W, H) / 420), col = T.bokeh[k % T.bokeh.length], a = .05 + rnd() * .1;
      const rg = g.createRadialGradient(x, y, 0, x, y, rr); rg.addColorStop(0, hexA(col, a)); rg.addColorStop(.72, hexA(col, a * .8)); rg.addColorStop(1, hexA(col, 0));
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    // vignette
    const vg = g.createRadialGradient(W / 2, H * .45, Math.min(W, H) * .25, W / 2, H * .5, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    // a glass shelf under every row
    const rowsBy = [...new Set(LY.slots.map(s => Math.round(s.by)))];
    for (const by of rowsBy) {
      const ss = LY.slots.filter(s => Math.round(s.by) === by), x0 = ss[0].cx - ss[0].cw / 2 + 4, x1 = ss[ss.length - 1].cx + ss[ss.length - 1].cw / 2 - 4, y = by + 2, h = Math.max(6, LY.gw * .16);
      const sg = g.createLinearGradient(0, y, 0, y + h); sg.addColorStop(0, 'rgba(255,255,255,.34)'); sg.addColorStop(.25, T.shelf); sg.addColorStop(1, 'rgba(255,255,255,.04)');
      g.fillStyle = sg; rrect(g, x0, y, x1 - x0, h, h / 2); g.fill();
      g.fillStyle = 'rgba(0,0,0,.18)'; rrect(g, x0 + 6, y + h, x1 - x0 - 12, h * .5, h / 4); g.fill();
    }
    // a soft shadow under every tube's place on the shelf
    for (const sl of LY.slots) { const r = LY.gw * .62, sg = g.createRadialGradient(sl.cx, sl.by + 2, 1, sl.cx, sl.by + 2, r); sg.addColorStop(0, 'rgba(0,0,0,.32)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sg; g.save(); g.translate(sl.cx, sl.by + 2); g.scale(1, .35); g.translate(-sl.cx, -sl.by - 2); g.beginPath(); g.arc(sl.cx, sl.by + 2, r, 0, 7); g.fill(); g.restore(); }
    const img = $('#lsBgImg'), my = ++bgGen; bg.style.display = ''; img.style.visibility = 'hidden';
    if (bg.toBlob && !window.__lsNoBgImg) bg.toBlob(b => {           // a plain image costs nothing to show
      if (!b || my !== bgGen) return;
      const url = URL.createObjectURL(b);
      img.onload = () => { if (my !== bgGen) return; img.style.visibility = ''; bg.style.display = 'none'; if (bgUrl) URL.revokeObjectURL(bgUrl); bgUrl = url; };
      img.src = url;
    });
  }
  let bgGen = 0, bgUrl = '';
  function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`; }

  /* ================= tubes: one small element each (glass back, liquid, glass front, cork, ice) ================= */
  let VT = [];
  const spriteCache = new Map();
  function sprite(G, front, small, dpr) {
    const key = [G.gw.toFixed(2), G.lh.toFixed(2), G.cap, front ? 1 : 0, small ? 1 : 0, dpr].join();
    let c = spriteCache.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = Math.ceil(G.W * dpr); c.height = Math.ceil(G.H * dpr);
    const g = c.getContext('2d'); g.scale(dpr, dpr); if (front) drawGlassFront(g, G); else drawGlassBack(g, G, small);
    if (spriteCache.size > 40) spriteCache.clear();
    spriteCache.set(key, c); return c;
  }
  function buildTubes() {
    world.querySelectorAll('.ls-t,.ls-s,.ls-hint').forEach(e => e.remove());
    const dpr = Math.min(+(window.__lsDpr || 1.6), devicePixelRatio || 1);   // tubes are small: 1.6x is sharp enough and much cheaper to update
    VT = S.T.map((_, i) => {
      const small = S.cap[i] < S.U, gw = LY.gw * (small ? .9 : 1), G = tubeGeom(gw, LY.lh, S.cap[i], S.U), sl = LY.slots[i];
      const el = document.createElement('div'); el.className = 'ls-t'; el.style.width = G.W + 'px'; el.style.height = G.H + 'px';
      const mk = cls => { const c = document.createElement('canvas'); c.className = cls; c.width = Math.ceil(G.W * dpr); c.height = Math.ceil(G.H * dpr); el.appendChild(c); return c; };
      const l = mk('l');                                           // one canvas: glass back + liquid + glass front (sprites are blitted)
      const cork = document.createElement('i'); cork.className = 'ls-cork';
      Object.assign(cork.style, { left: (G.pad + G.gw * .14) + 'px', top: (G.pad - G.rimH * .55) + 'px', width: (G.gw * .72) + 'px', height: (G.rimH * 1.5 + G.lh * .22) + 'px' });
      const ice = document.createElement('i'); ice.className = 'ls-ice'; ice.innerHTML = '<b></b>';
      Object.assign(ice.style, { left: (G.pad - 1) + 'px', top: (G.pad + G.rimH * .3) + 'px', width: (G.gw + 2) + 'px', height: (G.gh - G.rimH * .3 + 1) + 'px', fontSize: (G.gw * .42) + 'px' });
      el.appendChild(cork); el.appendChild(ice); world.appendChild(el);
      const lg = l.getContext('2d');
      return { i, el, l, lg, G, dpr, sb: sprite(G, false, small, dpr), sf: sprite(G, true, small, dpr), lastDraw: 0, hx: sl.cx - G.W / 2, hy: sl.by - (G.pad + G.gh), cork, ice, segs: [], corked: false, frozen: false, lift: 0, pose: null, shake: 0, wob: null, flash: [], bub: null, dirty: true, z: '', tf: '', small, busy: 0 };
    });
  }
  // the logic content of tube i as drawing segments: same-colour neighbours merged, hidden layers one by one
  function segsOf(i, T = S.T, H = S.hid) {
    const out = [];
    T[i].forEach((c, j) => { const h = !!H[i][j], p = out[out.length - 1]; if (p && !h && !p[2] && p[0] === c) p[1]++; else out.push([c, 1, h]); });
    return out;
  }
  const visDone = () => VT.reduce((n, v) => n + (v.corked ? 1 : 0), 0);
  const frozenVis = i => S.frz[i] > 0 && visDone() < S.frz[i];

  /* ================= the visual timeline =================
     A tap changes the rules state at once; what you see follows: the tube lifts, flies over, tilts and pours, comes back.
     Pours that share a tube wait for each other (busyUntil), pours of other tubes run side by side. Undo, restart,
     resume and resize throw the whole timeline away and rebuild the picture from the rules state (syncVisual). */
  let drawHist = [], sched = [], pours = [], busyUntil = [], raf = 0, lastT = 0, frames = [], tapAt = 0, tapLat = [], schedSorted = true, drawMs = 0;
  const at = (t, fn) => { sched.push([finite(t), fn]); schedSorted = false; requestDraw(); };   // a bad time can never block the timeline
  function syncVisual() {
    if (!S || !LY) return;
    sched = []; pours = []; world.querySelectorAll('.ls-s').forEach(e => e.remove());
    busyUntil = S.T.map(() => 0);
    VT.forEach((v, i) => {
      v.segs = segsOf(i); v.corked = isDone(S, i); v.pose = null; v.shake = 0; v.wob = null; v.flash = []; v.bub = null; v.dirty = true; v.busy = 0;
      v.lift = sel === i ? 1 : 0; v.cork.className = 'ls-cork' + (v.corked ? ' on still' : '');
    });
    VT.forEach((v, i) => { v.frozen = frozenVis(i); v.ice.className = 'ls-ice' + (v.frozen ? ' on' : ''); v.ice.firstChild.textContent = v.frozen ? S.frz[i] - visDone() : ''; });
    hud(); requestDraw();
  }
  const animating = i => busyUntil[i] > now() || pours.some(P => P.s === i || P.t === i);
  function schedulePour(s, t, r, before, after) {
    const T0 = now(), start = Math.max(T0, busyUntil[s] || 0, busyUntil[t] || 0), backlog = start - T0, k = backlog > .5 ? .55 : backlog > .15 ? .8 : 1;
    const n = r.n, dm = .27 * k, dp = (.2 + .1 * n) * k, db = .25 * k, tail = .08;
    const P = { s, t, c: r.c, n, t0: start, dm, dp, db, tail, before, after, done: r.done, thaw: r.thaw, rev: r.rev, ph: 0, stream: null, committed: false };
    P.tc = start + dm + dp + tail; P.end = P.tc + db;
    busyUntil[s] = P.end; busyUntil[t] = P.tc + .05;
    for (const i of r.thaw) busyUntil[i] = Math.max(busyUntil[i] || 0, P.tc + .35);
    if (![P.t0, P.tc, P.end].every(Number.isFinite)) { syncVisual(); return; }
    pours.push(P); requestDraw();
  }
  // where the source tube is while it pours: its lip right above the target's mouth
  function lipLocal(G, side) { return side > 0 ? [G.ix1 + G.wall * .4, G.iy0 - G.rimH * .25] : [G.ix0 - G.wall * .4, G.iy0 - G.rimH * .25]; }
  function poseForLip(G, side, lip, a) { const [lx, ly] = lipLocal(G, side), c = Math.cos(a), s = Math.sin(a); return { x: lip[0] - (lx * c - ly * s), y: lip[1] - (lx * s + ly * c), a }; }
  function startPour(P) {
    const A = VT[P.s], B = VT[P.t], v0 = P.before.s.reduce((x, y) => x + y[1], 0);
    // pour to the right (source on the left of the target) unless there is no room on that side
    const tcx = B.hx + B.G.W / 2, scx = A.hx + A.G.W / 2, reach = A.G.H * .85;
    let side = scx <= tcx ? 1 : -1;
    if (side > 0 && tcx - reach < 4 && tcx + reach < LY.W - 4) side = -1; else if (side < 0 && tcx + reach > LY.W - 4 && tcx - reach > 4) side = 1;
    P.side = side; P.v0 = v0;
    P.a0 = side * spillAngle(A.G, v0); P.a1 = side * Math.max(spillAngle(A.G, Math.max(0, v0 - P.n)), Math.abs(P.a0));
    P.lip = [tcx - side * B.G.iw * .14, B.hy + B.G.pad - Math.max(B.G.rimH * 1.2, LY.lh * .85)];
    P.home = [A.hx, A.hy]; P.lift0 = A.lift;
    const hl = lipLocal(A.G, side); P.lipHome = [A.hx + hl[0], A.hy - A.lift * LY.lift + hl[1]];
    A.segs = P.before.s.map(x => x.slice()); B.segs = P.before.t.map(x => x.slice()); A.dirty = B.dirty = true;
    P.started = true; sfx('lsLift');
  }
  const ease = u => { u = Math.max(0, Math.min(1, u)); return u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; };
  function moveSegs(base, amt, add, c) {                         // base segs with amt removed from the top (add=false) or added (add=true)
    const out = base.map(x => x.slice());
    if (add) { const p = out[out.length - 1]; if (p && p[0] === c && !p[2]) p[1] += amt; else if (amt > 0) out.push([c, amt, false]); }
    else { let left = amt; while (left > 1e-6 && out.length) { const p = out[out.length - 1], d = Math.min(p[1], left); p[1] -= d; left -= d; if (p[1] <= 1e-6) out.pop(); } }
    return out;
  }
  function updatePour(P, t) {
    if (t < P.t0) return;
    if (!P.started) startPour(P);
    const A = VT[P.s], B = VT[P.t], tt = t - P.t0;
    A.z = '30';
    if (tt < P.dm) {                                              // fly over, starting to tilt
      const u = ease(tt / P.dm), arc = Math.sin(Math.PI * u) * LY.lh * .45;
      const lip = [P.lipHome[0] + (P.lip[0] - P.lipHome[0]) * u, P.lipHome[1] + (P.lip[1] - P.lipHome[1]) * u - arc];
      A.pose = poseForLip(A.G, P.side, lip, P.a0 * .8 * u); A.dirty = true;
      return;
    }
    if (!P.committed) {
      const tp = tt - P.dm, u = Math.min(1, tp / P.dp), moved = P.n * u;
      const base = Math.abs(P.a0) * (.8 + .2 * Math.min(1, tp / .08)), ang = P.side * Math.max(base, spillAngle(A.G, Math.max(0, P.v0 - moved)));
      A.pose = poseForLip(A.G, P.side, P.lip, tp < P.dp ? ang : P.a1); P.aLast = A.pose.a;
      A.segs = moveSegs(P.before.s, moved, false); A.ang = A.pose.a;
      const into = P.n * Math.max(0, Math.min(1, (tp - .045) / P.dp));
      B.segs = moveSegs(P.before.t, into, true, P.c);
      A.dirty = B.dirty = true;
      // the stream: from the lip down to the liquid in the target
      if (!P.stream) { P.stream = document.createElement('i'); P.stream.className = 'ls-s'; const pc = PAL[P.c]; P.stream.style.background = `linear-gradient(90deg,${pc[2]},${pc[1]} 40%,${pc[0]} 70%,${pc[2]})`; P.stream.style.width = Math.max(3, A.G.iw * .2).toFixed(1) + 'px'; world.appendChild(P.stream); sfx('lsPour' + Math.min(5, Math.max(1, Math.round(1 + 4 * (B.segs.reduce((x, y) => x + y[1], 0) + P.n / 2) / (S.cap[P.t] || 4))))); }
      const vol = B.segs.reduce((x, y) => x + y[1], 0), surf = B.hy + levelFor(B.G, 0, Math.max(.02, vol)), V = 1500;
      const yTop = P.lip[1] + 1 + (tp > P.dp ? V * (tp - P.dp) : 0), yBot = Math.min(surf, P.lip[1] + V * tp);
      const w = parseFloat(P.stream.style.width);
      if (yBot - yTop > .5) { P.stream.hidden = false; P.stream.style.transform = `translate(${(P.lip[0] - w / 2).toFixed(1)}px,${yTop.toFixed(1)}px) scaleY(${((yBot - yTop) / 100).toFixed(3)})`; } else P.stream.hidden = true;
      // bubbles and a wobble where the stream comes in
      B.wob = { t0: t, amp: LY.lh * .1 }; B.bub = { t0: P.t0 + P.dm, x: P.lip[0] - B.hx, until: t + .6 };
      if (tp >= P.dp + P.tail) commit(P, t);
      return;
    }
    const tb = t - P.tc;                                          // fly back home
    if (tb < P.db) {
      const u = ease(tb / P.db), liftNow = sel === P.s && t + .05 >= busyUntil[P.s] ? 1 : 0;
      const hl = lipLocal(A.G, P.side), home = [A.hx + hl[0], A.hy - liftNow * LY.lift + hl[1]];
      const lip = [P.lip[0] + (home[0] - P.lip[0]) * u, P.lip[1] + (home[1] - P.lip[1]) * u];
      A.pose = poseForLip(A.G, P.side, lip, P.a1 * (1 - u)); A.lift = liftNow; A.dirty = true;
      return;
    }
    A.pose = null; A.z = ''; A.dirty = true; P.finished = true;
  }
  function commit(P, t) {
    const A = VT[P.s], B = VT[P.t];
    P.committed = true; if (P.stream) { P.stream.remove(); P.stream = null; }
    A.segs = P.after.s.map(x => x.slice()); B.segs = P.after.t.map(x => x.slice()); A.dirty = B.dirty = true;
    B.wob = { t0: t, amp: LY.lh * .16 };
    // layers that came to light in the source
    if (P.rev.length) { const idx = []; A.segs.forEach((sg, k) => { if (k >= A.segs.length - 1) idx.push(k); }); A.flash = idx.map(k => [k, t]); sfx('lsReveal'); sparkleAt(P.s, '#ffffff', 6, .25); }
    if (P.done.length) {
      B.corked = true; B.cork.className = 'ls-cork on'; sfx('lsDone'); vibrate(15);
      sparkleAt(P.t, PAL[P.c][1], 14, 0);
      const D = visDone();
      VT.forEach((v, i) => {
        const fz = S.frz[i] > 0 && D < S.frz[i];
        if (v.frozen && !fz) { v.frozen = false; v.ice.className = 'ls-ice thaw'; at(t + .7, () => { if (!v.frozen) v.ice.className = 'ls-ice'; }); sfx('lsThaw'); sparkleAt(i, '#cdefff', 10, .3); }
        else if (v.frozen) v.ice.firstChild.textContent = S.frz[i] - D;
      });
    }
  }

  /* ================= drawing ================= */
  function requestDraw() { if (!raf) raf = requestAnimationFrame(frame); }
  function tubeBusy(v, t) {
    return !!(v.dirty || v.pose || (v.wob && t < v.wob.t0 + .9) || (v.bub && t < v.bub.until) || v.flash.length || Math.abs(v.lift - liftGoal(v)) > .002 || (v.shake && t < v.shake + .4));
  }
  const liftGoal = v => (sel === v.i && !animating(v.i)) ? 1 : 0;
  function busy(t) { if (sched.length || pours.length) return true; for (const v of VT) if (tubeBusy(v, t)) return true; return false; }
  function frame(ts) {
    raf = 0; frames.push(ts); if (frames.length > 900) frames.splice(0, 450);
    if (current !== 'ls' || !S || !LY) return;
    const t0 = performance.now(), t = now(), dt = Math.min(.1, Math.max(0, t - (lastT || t))); lastT = t;
    if (sched.length) { if (!schedSorted) { sched.sort((a, b) => a[0] - b[0]); schedSorted = true; } while (sched.length && sched[0][0] <= t) sched.shift()[1](); }
    for (const P of pours) updatePour(P, t);
    if (pours.some(P => P.finished)) pours = pours.filter(P => !P.finished);
    for (const v of VT) drawTube(v, t, dt);
    paintTubes(t);
    drawMs = performance.now() - t0; drawHist.push(+drawMs.toFixed(1)); if (drawHist.length > 400) drawHist.splice(0, 200);
    if (tapAt) { tapLat.push(performance.now() - tapAt); if (tapLat.length > 80) tapLat.shift(); tapAt = 0; }
    if (busy(t)) requestDraw(); else lastT = 0;
  }
  function drawTube(v, t, dt) {
    // position
    if (!v.pose) {
      const goal = liftGoal(v); v.lift += (goal - v.lift) * (1 - Math.exp(-dt * 24)); if (Math.abs(goal - v.lift) < .003) v.lift = goal;
      let sx = 0; if (v.shake) { const u = (t - v.shake) / .4; if (u < 1) sx = Math.sin(u * Math.PI * 6) * LY.gw * .09 * (1 - u); else v.shake = 0; }
      const tf = `translate(${(v.hx + sx).toFixed(2)}px,${(v.hy - v.lift * LY.lift).toFixed(2)}px)`;
      if (v.tf !== tf) { v.el.style.transform = tf; v.tf = tf; }
      if (v.ang) { v.ang = 0; v.dirty = true; }
    } else {
      const p = v.pose, tf = `translate(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px) rotate(${p.a.toFixed(4)}rad)`;
      if (v.tf !== tf) { v.el.style.transform = tf; v.tf = tf; }
      if (v.ang !== p.a) { v.ang = p.a; v.dirty = true; }
    }
    const z = v.pose ? '30' : v.lift > .01 ? '20' : ''; if (v.z2 !== z) { v.el.style.zIndex = z; v.z2 = z; }
        // liquid
    const wob = v.wob && t < v.wob.t0 + .9 ? v.wob.amp * Math.exp(-(t - v.wob.t0) * 4.2) : 0; if (v.wob && !wob) { v.wob = null; v.dirty = true; }
    let bub = null;
    if (v.bub) {
      if (t >= v.bub.until) { v.bub = null; v.dirty = true; }
      else {
        const G = v.G, vol = v.segs.reduce((x, y) => x + y[1], 0), surf = levelFor(G, 0, Math.max(.05, vol)), depth = Math.max(4, G.iyb - surf - 2), fade = Math.min(1, (v.bub.until - t) / .4);
        bub = []; for (let k = 0; k < 7; k++) { const ph = ((t - v.bub.t0) * (.9 + k * .13) + k * .37) % 1, y = surf + depth * (1 - ph) * .9 + 2, x = v.bub.x + Math.sin(k * 2.3 + t * 3) * G.iw * .22; if (y > surf + 1.5) bub.push([Math.max(G.ix0 + 2, Math.min(G.ix1 - 2, x)), y, Math.max(.8, G.iw * (.04 + (k % 3) * .02)), fade * (1 - ph * .5)]); }
      }
    }
    const flash = v.flash.length ? v.flash.map(([k, t0]) => [k, Math.max(0, 1 - (t - t0) / .5)]) : null;
    if (v.flash.length && flash.every(f => f[1] <= 0)) { v.flash = []; v.dirty = true; }
    v.paint = v.dirty || wob || bub || flash ? { wob, bub, flash, pri: v.dirty ? (v.pose ? 0 : 1) : 2 } : null;
  }
  // repainting a tube's canvas (and handing it to the compositor) is the expensive part: at most a few per frame,
  // the most important first (the tube that is pouring), the rest next frame; wobbles and bubbles at about 30 per second
  const MAXP = +(window.__lsMaxP || 2);
  function paintTubes(t) {
    const todo = VT.filter(v => v.paint).sort((a, b) => a.paint.pri - b.paint.pri || a.lastDraw - b.lastDraw);
    let n = 0;
    for (const v of todo) { if (n >= MAXP) break; if (v.paint.pri === 2 && t - v.lastDraw < .028) continue; paintTube(v, t); n++; }
  }
  function paintTube(v, t) {
    const { wob, bub, flash } = v.paint; v.paint = null; v.dirty = false; v.lastDraw = t;
    const g = v.lg, k = v.dpr; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, v.l.width, v.l.height); g.drawImage(v.sb, 0, 0); g.setTransform(k, 0, 0, k, 0, 0);
    drawLiquid(g, v.G, v.segs, v.ang || 0, { wob, ph: t * 9, cb: opt.cb, bub, flash });
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(v.sf, 0, 0);
  }

  /* ---------- effects: little CSS-animated elements (the compositor plays them) ---------- */
  function fxEl(cls, x, y, life, css = '', html = '') {
    const e = document.createElement('i'); e.className = 'ls-fx ' + cls; if (html) e.innerHTML = html;
    e.style.cssText = `left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;animation-duration:${life}s;${css}`;
    world.appendChild(e); setTimeout(() => e.remove(), life * 1000 + 200);
  }
  function sparkleAt(i, col, n, dy) {
    const v = VT[i]; if (!v) return;
    const x = v.hx + v.G.W / 2, y = v.hy + v.G.pad + v.G.rimH + (v.G.gh - v.G.rimH) * dy, sc = LY.gw;
    for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, s = (.5 + Math.random() * .9) * sc * 1.1, sz = (.16 + Math.random() * .14) * sc;
      fxEl('spark', x, y, .5 + Math.random() * .35, `width:${sz.toFixed(1)}px;height:${sz.toFixed(1)}px;color:${k % 3 ? col : '#fff8d0'};--dx:${(Math.cos(a) * s).toFixed(1)}px;--dy:${(Math.sin(a) * s - sc * .3).toFixed(1)}px`); }
  }
  function confetti() {
    const box = $('#lsConf'), cols = PAL.slice(0, 10).map(p => p[0]); box.innerHTML = '';
    for (let i = 0; i < 48; i++) {
      const e = document.createElement('i'), w = 7 + Math.random() * 6;
      e.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;width:${w.toFixed(0)}px;height:${(w * .55).toFixed(0)}px;background:${cols[i % cols.length]};animation-duration:${(2.2 + Math.random() * 1.4).toFixed(2)}s;animation-delay:${(Math.random() * .6).toFixed(2)}s;--dx:${((Math.random() - .5) * 80).toFixed(0)}px;--r:${(360 + Math.random() * 720).toFixed(0)}deg`;
      box.appendChild(e);
    }
    clearTimeout(confT); confT = setTimeout(() => { box.innerHTML = ''; }, 4500);
  }
  let confT = 0;

  /* ================= game ================= */
  function snapshot() { return { T: S.T.map(t => t.slice()), hid: S.hid.map(h => h.slice()) }; }
  function restore(sn) {
    const n = S.T.length;                                         // an extra tube bought later stays (empty)
    S.T = sn.T.map(t => t.slice()); S.hid = sn.hid.map(h => h.slice());
    while (S.T.length < n) { S.T.push([]); S.hid.push([]); }
    S.done = countDone(S); S.won = isWon(S);
  }
  function startLevel(id, custom) {
    closeModals(); $('#lsConf').innerHTML = ''; clearHint();
    L = custom || levelOf(id); if (!L) return;
    S = newState(L); G = { id, moves: 0, undoLeft: UNDO_FREE, tips: 0, xtube: false, helped: false, undo: [], over: false, time: 0, last: Date.now() };
    sel = -1; stats.played++; saveStats();
    LY = null; fit(true); hud(); renderTools(); saveNow();
    scr.classList.remove('intro'); void scr.offsetWidth; scr.classList.add('intro');
    showTip(); handHint();
    watchStuck(.5);
  }
  function showTip() {
    const el = $('#lsTip'); el.classList.remove('show');
    if (!L || !L.tip || !TIPS[L.tip] || G.moves) return;
    el.innerHTML = `<b>💡</b><span>${esc(TIPS[L.tip])}</span>`;
    setTimeout(() => { if (G && !G.moves) el.classList.add('show'); }, 350);
  }
  const hideTip = () => $('#lsTip').classList.remove('show');
  function handHint() {                                           // level 1-2: a pointing hand shows the first move
    const h = $('#lsHand'); h.classList.remove('show');
    if (!G || !(G.id === 1 || G.id === 2) || G.moves > 1 || !LY) return;
    const mv = decMoves(L.s)[G.moves]; if (!mv) return;
    const i = sel === mv[0] ? mv[1] : mv[0], v = VT[i];
    h.style.left = (v.hx + v.G.W / 2) + 'px'; h.style.top = (v.hy + v.G.pad + v.G.gh * .45) + 'px'; h.classList.add('show');
  }
  const hideHand = () => $('#lsHand').classList.remove('show');
  function hud() {
    if (!S || !G) return;
    $('#lsTitle').textContent = typeof G.id === 'number' ? 'Level ' + G.id : 'Dagpuzzel';
    $('#lsMoves').textContent = G.moves;
    $('#lsPar').textContent = threeAt();
  }
  const threeAt = () => L.m + Math.max(1, Math.round(L.m * .1));
  function tapTube(i) {
    if (!S || !G || G.over || G.preview || i < 0 || i >= S.T.length) return;
    tapAt = tapAt || performance.now(); hideTip(); clearHint();
    const t = Date.now(); G.time += Math.min(30, (t - (G.last || t)) / 1000); G.last = t;
    if (sel < 0) {
      if (frozen(S, i)) { refuse(i, frozenText(i)); return; }
      if (!S.T[i].length) { refuse(i, null); return; }
      if (isDone(S, i)) { refuse(i, WHY.corked); return; }
      sel = i; sfx('lsPick'); handHint(); requestDraw(); return;
    }
    if (sel === i) { sel = -1; sfx('lsPut'); handHint(); requestDraw(); return; }
    const s = sel; sel = -1;
    const err = why(S, s, i);
    if (err) {
      // tapping another tube that cannot take it: show why, and pick that tube up instead when it can pour itself
      if (err === 'frozen') refuse(frozen(S, i) ? i : s, frozenText(frozen(S, i) ? i : s));
      else refuse(i, WHY[err] || null);
      requestDraw(); handHint(); return;
    }
    const before = { s: segsOf(s), t: segsOf(i) }, sn = snapshot();
    const r = pour(S, s, i);
    G.undo.push(sn); if (G.undo.length > 60) G.undo.shift();
    G.moves++; stats.pours++;
    schedulePour(s, i, r, before, { s: segsOf(s), t: segsOf(i) });
    afterMove(); save(); handHint();
  }
  function frozenText(i) { const k = S.frz[i] - S.done; return `Dit buisje is bevroren. Het ontdooit als er nog ${k} ${k === 1 ? 'buisje' : 'buisjes'} klaar ${k === 1 ? 'is' : 'zijn'}.`; }
  let refuseN = 0;
  function refuse(i, text) {
    sfx('lsNo'); vibrate(10); if (VT[i]) VT[i].shake = now();
    if (text && (refuseN++ < 6 || text !== WHY.colour)) toast(text);
    requestDraw();
  }
  function afterMove() {
    hud(); renderTools();
    const game = G, endAt = Math.max(now(), ...busyUntil);
    if (S.won) win();
    else watchStuck(.45);
    void game; void endAt;
  }
  // no sensible move left? then the "Geen zetten meer" dialog, once the pours on screen have finished
  function watchStuck(delay) {
    if (!S || !G || G.over || G.preview || !stuck(S)) return;
    const game = G; at(Math.max(now(), ...busyUntil) + delay, () => { if (G === game && S && stuck(S) && !G.over && current === 'ls' && !anyModal()) openStuck(); });
  }
  function useUndo() {
    if (!S || !G || G.over || G.preview) return false;
    hideTip(); clearHint();
    if (!G.undo.length) { toast('Er is nog niets om terug te zetten.'); return false; }
    if (G.undoLeft <= 0 && stats.inv.undo <= 0) { toast('Je Terug-zetten zijn op. Met de dagpuzzel en drie sterren verdien je er nieuwe; ↻ Opnieuw kan altijd.', 3400); return false; }
    if (G.undoLeft > 0) G.undoLeft--; else { stats.inv.undo--; saveStats(); }
    restore(G.undo.pop()); G.moves = Math.max(0, G.moves - 1); sel = -1;
    closeModals(); syncVisual(); sfx('lsUndo');
    renderTools(); save(); handHint(); watchStuck(.6); return true;
  }
  function useTube() {
    if (!S || !G || G.over || G.preview) return false;
    hideTip(); clearHint();
    if (G.xtube) { toast('Je hebt in dit level al een extra buisje.'); return false; }
    if (stats.inv.tube <= 0) { toast('Je extra buisjes zijn op. Elke 10 levels en elke dagpuzzel geven je er een bij.', 3200); return false; }
    stats.inv.tube--; saveStats(); G.xtube = true; G.helped = true; sel = -1;
    addTube(S); closeModals(); fit(true); sfx('lsBoost');
    const v = VT[VT.length - 1]; v.el.classList.add('pop'); sparkleAt(VT.length - 1, '#bff3ff', 14, .5);
    renderTools(); save(); return true;
  }
  function useHint() {
    if (!S || !G || G.over || G.preview) return false;
    hideTip(); clearHint();
    if (G.tips >= TIP_FREE) { toast(`Je hebt de ${TIP_FREE} tips van dit level al gebruikt.`); return false; }
    let sol = solve(S, { w: 1.5, max: 60000, ms: 350 });
    if (!sol && solve.why === 'budget') sol = solve(S, { w: 3, max: 120000, ms: 500 });
    if (!sol) { toast(solve.why === 'none' ? 'Vanaf hier lukt het niet meer. Zet een paar zetten terug, neem een extra buisje of begin opnieuw.' : 'Even geen tip gevonden. Probeer het zo nog eens.', 3600); sfx('lsNo'); return false; }
    if (!sol.length) return false;
    G.tips++; G.helped = true; sfx('lsHint');
    const [s, t] = sol[0]; sel = -1; showHintMarks(s, t); renderTools(); requestDraw(); save();
    return [s, t];
  }
  let hintEls = [];
  function showHintMarks(s, t) {
    clearHint();
    [[s, '1'], [t, '2']].forEach(([i, lab], k) => {
      const v = VT[i], e = document.createElement('i'); e.className = 'ls-hint' + (k ? ' to' : ''); e.textContent = lab;
      e.style.left = (v.hx + v.G.W / 2) + 'px'; e.style.top = Math.max(40, v.hy + v.G.pad - LY.lift - 6) + 'px'; world.appendChild(e); hintEls.push(e);
    });
  }
  function clearHint() { hintEls.forEach(e => e.remove()); hintEls = []; }
  function starsFor() {
    const m = G.moves, par = L.m;
    let st = m <= threeAt() ? 3 : m <= Math.round(par * 1.5) + 2 ? 2 : 1;
    if (G.helped) st = Math.min(st, 2);
    return st;
  }
  function win() {
    G.over = true; sel = -1; store.del('ls.save'); clearHint();
    const st = starsFor(), id = G.id, gift = [];
    stats.won++; stats.time += Math.round(G.time);
    if (typeof id === 'number') {
      const prev = stats.stars[id] || 0;
      if (st > prev) stats.stars[id] = st;
      if (st === 3 && prev < 3) { stats.three = (stats.three || 0) + 1; if (id % 4 === 0) { stats.inv.undo++; gift.push('↶ +1 Terug'); } }
      if (!prev && id % 10 === 0) { stats.inv.tube++; gift.push('🧪 +1 extra buisje'); }
      if (!stats.best[id] || G.time < stats.best[id]) stats.best[id] = Math.round(G.time);
    } else {
      const d = String(id).slice(1);
      if (!stats.daily[d]) { stats.dailyWon++; stats.inv.undo += 2; stats.inv.tube++; gift.push('↶ +2 Terug', '🧪 +1 extra buisje'); }
      stats.daily[d] = Math.max(stats.daily[d] || 0, st); const ks = Object.keys(stats.daily).sort(); while (ks.length > 60) delete stats.daily[ks.shift()];
    }
    saveStats();
    G.res = { st, gift };
    const game = G, t = Math.max(now(), ...busyUntil);
    at(t + .15, () => { if (G !== game || current !== 'ls') return; confetti(); sfx('lsWin'); vibrate(30); VT.filter(v => v.corked).slice(0, 4).forEach((v, k) => setTimeout(() => sparkleAt(v.i, '#fff3b0', 5, .1), k * 90)); });
    at(t + 1.6, () => { if (G !== game || current !== 'ls') return; openEnd(); });
    requestDraw();
  }
  const fmtTime = s => { s = Math.round(s); return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : s + ' s'; };
  function openEnd() {
    const { st, gift } = G.res, daily = typeof G.id !== 'number', nx = daily ? 0 : G.id + 1;
    $('#lsEndStars').innerHTML = [1, 2, 3].map(k => `<span class="${k <= st ? 'on' : ''}" style="animation-delay:${.15 + k * .2}s">★</span>`).join('');
    $('#lsEndTitle').textContent = daily ? 'Dagpuzzel opgelost!' : G.id === NL ? 'Alle levels opgelost!' : ['', 'Opgelost!', 'Mooi gesorteerd!', 'Perfect gesorteerd!'][st];
    $('#lsEndText').innerHTML = `<b>${G.moves}</b> zetten · ★★★ bij ${threeAt()} of minder<br><small>Tijd ${fmtTime(G.time)}${G.helped ? ' · met hulp (tip of extra buisje): hooguit 2 sterren' : ''}</small>`
      + (gift.length ? `<br><span class="ls-gift">${gift.join(' · ')}</span>` : '');
    $('#lsEndNext').hidden = daily || nx > NL;
    openModal('lsEndModal');
  }
  function openStuck() {
    if (!S || !G || G.over) return;
    sfx('lsStuck');
    const u = G.undoLeft + stats.inv.undo;
    $('#lsStuckUndo').innerHTML = `↶ Terug <small>(${u})</small>`; $('#lsStuckUndo').disabled = !G.undo.length || u <= 0;
    $('#lsStuckTube').innerHTML = `🧪 Extra buisje <small>(${G.xtube ? 0 : stats.inv.tube})</small>`; $('#lsStuckTube').disabled = G.xtube || stats.inv.tube <= 0;
    openModal('lsStuckModal');
  }
  let toastT = 0;
  function toast(t, ms = 2600) { const el = $('#lsToast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); }
  function renderTools() {
    if (!G) return;
    const n = { undo: G.undoLeft + stats.inv.undo, tube: G.xtube ? 0 : stats.inv.tube, hint: Math.max(0, TIP_FREE - G.tips) };
    document.querySelectorAll('#lsTools button[data-b]').forEach(b => { const k = b.dataset.b; if (n[k] === undefined) return; b.querySelector('i').textContent = n[k]; b.classList.toggle('out', n[k] <= 0); });
  }

  /* ================= save / resume ================= */
  let saveTm = 0;
  function saveNow() { clearTimeout(saveTm); saveTm = 0; if (!S || !G || G.over || G.preview) return; store.set('ls.save', { G: Object.assign({}, G, { undo: G.undo.slice(-30) }), C: snapshot(), x: S.T.length - L.t.length }); }
  const save = () => { clearTimeout(saveTm); saveTm = setTimeout(saveNow, 250); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'ls') saveNow(); });
  function restoreSaved(sv) {
    L = levelOf(sv.G.id); if (!L) throw new Error('level');
    S = newState(L); for (let k = 0; k < (sv.x || 0); k++) addTube(S);
    if (sv.C.T.length !== S.T.length || sv.C.T.flat().length !== L.t.join('').length) throw new Error('save');
    G = Object.assign({ undo: [], undoLeft: UNDO_FREE, tips: 0 }, sv.G, { last: Date.now() }); restore(sv.C); sel = -1;
  }
  function preview() {                                              // the next level behind the start dialog
    const n = unlocked(); L = LV[n - 1]; S = newState(L); G = { id: n, preview: true, moves: 0, undo: [], over: false, undoLeft: UNDO_FREE, tips: 0 }; sel = -1;
    LY = null; fit(true);
  }

  /* ================= start dialog ================= */
  function renderStart() {
    const un = unlocked();
    $('#lsLevels').innerHTML = LV.map((_, i) => {
      const n = i + 1, st = stats.stars[n] || 0, lock = n > un;
      return `<button data-n="${n}" class="${lock ? 'lock' : ''}${n === un && !st ? ' next' : ''}"${lock ? ' aria-disabled="true"' : ''}>${lock ? '<b>🔒</b>' : `<b>${n}</b><span>${[1, 2, 3].map(k => `<i class="${k <= st ? 'on' : ''}">★</i>`).join('')}</span>`}</button>`;
    }).join('');
    const d = dayStr(), dn = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }), done = stats.daily[d], dlock = !dailyOpen();
    $('#lsDaily').innerHTML = `<span class="ls-dico">📅</span><span class="ls-dtx"><b>Dagpuzzel</b><small>${dlock ? 'Elke dag een nieuwe puzzel, vanaf level ' + DAILY_FROM : esc(dn) + ' · elke dag een nieuwe puzzel'}</small></span><em>${dlock ? '🔒' : done ? '✓ ' + '★'.repeat(done) : 'Speel ▶'}</em>`;
    $('#lsDaily').classList.toggle('done', !!done); $('#lsDaily').classList.toggle('lock', dlock);
    $('#lsInv').innerHTML = `<span>↶ <b>${stats.inv.undo}</b> extra Terug</span><span>🧪 <b>${stats.inv.tube}</b> extra buisjes</span><small>Elk level: ${UNDO_FREE}× Terug en ${TIP_FREE} tips</small>`;
    $('#lsOptList').innerHTML = [['theme', 'Achtergrond', Object.entries(THEMES).map(([k, t]) => [k, t.name])], ['cb', 'Kleurenblind-hulp', [[true, 'Aan'], [false, 'Uit']]], ['sound', 'Geluidseffecten', [[true, 'Aan'], [false, 'Uit']]], ['music', 'Achtergrondmuziek', [[true, 'Aan'], [false, 'Uit']]]]
      .map(([k, l, ch]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${ch.map(([v, t]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
    $('#lsStats').innerHTML = [['Levels', `${Object.keys(stats.stars).length}/${NL}`], ['Sterren', totalStars()], ['Dagpuzzels', stats.dailyWon], ['Speeltijd', fmtTime(stats.time || 0)]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
    const live = S && G && !G.over && !G.preview;
    $('#lsResume').hidden = !live;
    $('#lsGo').textContent = live ? 'Verder ▶' : `Level ${un} ▶`;
    $('#lsGo').dataset.n = live ? '' : un;
  }

  /* ================= input ================= */
  function hitTube(px, py) {
    if (!LY || !VT.length) return -1;
    let best = -1, bd = 1e9;
    VT.forEach((v, i) => {
      const sl = LY.slots[i], top = v.hy + v.G.pad - LY.lift - 8, bot = sl.by + 12;
      if (py < top - LY.lh * .4 || py > bot + LY.lh * .3) return;
      const dx = Math.abs(px - sl.cx); if (dx > sl.cw / 2) return;
      const d = dx + Math.max(0, top - py, py - bot); if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  let down = null;
  const sp = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  stage.addEventListener('pointerdown', e => { if (!S || e.target.closest('#lsTip')) return; e.preventDefault(); down = Object.assign(sp(e), { id: e.pointerId }); tapAt = performance.now(); const i = hitTube(down.x, down.y); down.i = i; if (i >= 0) tapTube(i); else { tapAt = 0; if (sel >= 0) { sel = -1; requestDraw(); } } });
  stage.addEventListener('pointerup', e => { if (down && down.id === e.pointerId) down = null; });
  stage.addEventListener('pointercancel', () => { down = null; });
  $('#lsTools').addEventListener('click', e => { const b = e.target.closest('button[data-b]'); if (!b) return; const k = b.dataset.b; if (k === 'undo') useUndo(); else if (k === 'tube') useTube(); else if (k === 'hint') useHint(); });
  $('#lsTip').addEventListener('click', hideTip);
  $('#lsLevels').addEventListener('click', e => { const b = e.target.closest('button[data-n]'); if (!b) return; if (b.classList.contains('lock')) { menuToast('Haal eerst de levels ervoor.'); return; } startLevel(+b.dataset.n); });
  $('#lsDaily').addEventListener('click', () => { if (!dailyOpen()) { menuToast(`De dagpuzzel gaat open als je level ${DAILY_FROM - 1} hebt gehaald.`); return; } startLevel('d' + dayStr()); });
  $('#lsOptList').addEventListener('click', e => {
    const b = e.target.closest('button[data-k]'); if (!b) return;
    const k = b.dataset.k; opt[k] = JSON.parse(b.dataset.v); saveOpt(); renderStart(); Sfx.refresh && Sfx.refresh();
    if (k === 'theme' && LY) drawBg();
    if (k === 'cb') { VT.forEach(v => { v.dirty = true; }); requestDraw(); }
  });
  $('#lsGo').addEventListener('click', () => { const n = $('#lsGo').dataset.n; if (n) startLevel(+n); else closeModals(); });
  $('#lsResume').addEventListener('click', () => closeModals());
  $('#lsStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#lsEndMenu').addEventListener('click', () => { closeModals(); openStart(); });
  $('#lsEndRetry').addEventListener('click', () => startLevel(G.id));
  $('#lsEndNext').addEventListener('click', () => { if (typeof G.id === 'number' && G.id < NL) startLevel(G.id + 1); });
  $('#lsStuckUndo').addEventListener('click', () => useUndo());
  $('#lsStuckTube').addEventListener('click', () => useTube());
  $('#lsStuckRetry').addEventListener('click', () => startLevel(G.id));
  $('#lsStuckMenu').addEventListener('click', () => { closeModals(); openStart(); });
  $('#lsBack').addEventListener('click', () => leave());
  $('#lsMenu').addEventListener('click', () => openStart());
  $('#lsRetry').addEventListener('click', async () => {
    if (!S || !G || G.preview) return;
    if (G.moves && !G.over && !(await askConfirm('Opnieuw beginnen?', 'Je begint dit level opnieuw. Gebruikte extra buisjes krijg je niet terug.', 'Opnieuw'))) return;
    startLevel(G.id);
  });
  function openStart() { sel = -1; requestDraw(); renderStart(); openModal('lsStartModal'); }
  window.addEventListener('resize', () => { if (current === 'ls') setTimeout(() => { fit(); clearHint(); handHint(); }, 60); });
  window.addEventListener('keydown', e => { if (current !== 'ls' || anyModal() || !S) return; if (e.key === 'z' && (e.ctrlKey || e.metaKey)) useUndo(); });

  function enter() {
    show('ls');
    const sv = store.get('ls.save', null);
    if ((!S || !G || G.preview || G.over) && sv && sv.G) { try { restoreSaved(sv); } catch (e) { S = null; G = null; store.del('ls.save'); } }
    if (S && G && !G.preview && !G.over) { LY = null; fit(true); renderTools(); requestAnimationFrame(() => fit()); if (stuck(S)) watchStuck(.3); else showTip(); }
    else { preview(); renderTools(); openStart(); }
  }
  function leave() { $('#lsConf').innerHTML = ''; saveNow(); closeModals(); hideTip(); hideHand(); clearHint(); if (G && G.over) { S = null; G = null; } sel = -1; show('menu'); refreshMenu(); }

  /* ================= test hooks ================= */
  function center(i) { const v = VT[i], r = stage.getBoundingClientRect(); return { x: r.left + LY.slots[i].cx, y: r.top + v.hy + v.G.pad + v.G.gh * .55 }; }
  const round = segs => segs.map(([c, a, h]) => [c, Math.round(a * 1000) / 1000, !!h]);
  window.__ls = {
    get S() { return S; }, get G() { return G; }, get L() { return L; }, get LY() { return LY; }, get VT() { return VT; }, get sel() { return sel; },
    LV, DLY, newState, pour, solve, legal, stuck, why, decMoves, opt, stats: () => stats, startLevel, tapTube, useUndo, useTube, useHint, center, hitTube, fit, syncVisual, levelOf, dayStr, snapshot,
    busy: () => busy(now()), loopOn: () => !!raf, doneIn: () => Math.max(0, Math.max(0, ...busyUntil) - now()),
    timeline: () => ({ sched: sched.map(x => x[0]), pours: pours.map(P => [P.t0, P.tc, P.end]), busy: busyUntil.slice() }),
    frames: () => frames.slice(), tapLat: () => tapLat.slice(), drawMs: () => drawMs, drawHist: () => drawHist.slice(),
    // visual == logic? (call when nothing moves)
    check() {
      const bad = [];
      S.T.forEach((_, i) => {
        const v = VT[i]; if (!v) { bad.push(i + ': no tube'); return; }
        if (JSON.stringify(round(v.segs)) !== JSON.stringify(round(segsOf(i)))) bad.push(i + ': segs ' + JSON.stringify(round(v.segs)) + ' vs ' + JSON.stringify(round(segsOf(i))));
        if (v.corked !== isDone(S, i) || v.cork.classList.contains('on') !== v.corked) bad.push(i + ': cork');
        if (v.frozen !== frozen(S, i) || v.ice.classList.contains('on') !== v.frozen) bad.push(i + ': ice');
        if (v.pose || v.ang) bad.push(i + ': still tilted');
        const tf = `translate(${v.hx.toFixed(2)}px,${(v.hy - v.lift * LY.lift).toFixed(2)}px)`; if (v.tf !== tf) bad.push(i + ': not home ' + v.tf + ' ' + tf);
        if (Math.abs(v.lift - (sel === i ? 1 : 0)) > .01) bad.push(i + ': lift');
      });
      if (VT.length !== S.T.length) bad.push('tube count');
      if (world.querySelectorAll('.ls-s').length) bad.push('stream left');
      return bad;
    },
    speed(k) { clk0 = now(); clkP = performance.now() / 1000; clkK = k; },
    give(k, n) { stats.inv[k] += n; saveStats(); renderTools(); },
  };
  return { enter, leave, hasSave: () => !!store.get('ls.save', null) };
})();
$('#tileLs').addEventListener('click', () => Kleurbuisjes.enter());
