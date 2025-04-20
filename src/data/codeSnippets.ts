export interface CodeSnippet {
  code: string;
  top: string;
  left: string;
  delay: string;
}

export const codeSnippets: CodeSnippet[] = [
  {
    code: `; MUMPS Database Management
SET ^PATIENT("SMITH,JOHN",1)="DOB:19600123"
SET ^PATIENT("SMITH,JOHN",2)="GENDER:M"
SET ^PATIENT("SMITH,JOHN",3)="DIABETES:TYPE2"

WRITE "Patient Record Created",!

NEW IDX,DATA
SET IDX=""
FOR  SET IDX=$ORDER(^PATIENT("SMITH,JOHN",IDX)) QUIT:IDX=""  DO
. SET DATA=^PATIENT("SMITH,JOHN",IDX)
. WRITE IDX,": ",DATA,!

KILL ^PATIENT("SMITH,JOHN",3)
WRITE "Record updated.",!`,
    top: '5%',
    left: '10%',
    delay: '0s'
  },
  {
    code: `* SNOBOL4 Text Processing
        INPUT SENTENCE
        WORDPAT = SPAN(" ") BREAK(" ") . WORD
        
        OUTPUT = ""
        
LOOP    SENTENCE WORDPAT = WORD
        OUTPUT = OUTPUT " " REVERSE(WORD) :F(DONE)
        SENTENCE = SENTENCE TAB(SIZE(WORD) + 1) :F(DONE)
        :(LOOP)
        
DONE    OUTPUT LEN(1) = ""
        OUTPUT SENTENCE
        
DEFINE("REVERSE(S)")
        REVERSE REVERSE = ""
        S LEN(1) . CHAR = :F(RETURN)
        &ANCHOR = 1
        REVERSE = CHAR REVERSE
        S = S TAB(2) :F(RETURN)
        :(REVERSE)
RETURN  REVERSE = REVERSE S
        :(RETURN)
END`,
    top: '15%',
    left: '70%',
    delay: '1s'
  },
  {
    code: `-- Ada Concurrent Task Example
with Ada.Text_IO; use Ada.Text_IO;

procedure Main is
   task type Worker is
      entry Start(ID : Integer);
      entry Stop;
   end Worker;

   task body Worker is
      MyID : Integer;
      Running : Boolean := True;
   begin
      accept Start(ID : Integer) do
         MyID := ID;
      end Start;

      while Running loop
         delay 1.0;  -- Simulate work
         Put_Line("Worker " & Integer'Image(MyID) & " processing...");
         
         select
            accept Stop do
               Running := False;
            end Stop;
         else
            null;  -- Continue working
         end select;
      end loop;

      Put_Line("Worker " & Integer'Image(MyID) & " terminated");
   end Worker;

   W1, W2 : Worker;
begin
   W1.Start(1);
   W2.Start(2);
   delay 5.0;
   W1.Stop;
   W2.Stop;
end Main;`,
    top: '30%',
    left: '20%',
    delay: '2s'
  },
  {
    code: `; Brainfuck Memoization
++++++++++[>+>+++>+++++++>++++++++++<<<<-]>>>++.>+.+++++++..+++.<<++.>+++++++++++++++.>.+++.------.--------.<<+.<.
>++++++++++[>+>+++>+++++++>++++++++++<<<<-]>>>++.>+.+++++++..+++.<<++.>+++++++++++++++.>.+++.------.--------.<<+.<.
>++++++++++[>+>+++>+++++++>++++++++++<<<<-]>>>++.>+.+++++++..+++.<<++.>+++++++++++++++.>.+++.------.--------.<<+.<.`,
    top: '45%',
    left: '60%',
    delay: '3s'
  },
  {
    code: `# Prolog Debounce Implementation
:- module(debounce, [debounce/3]).

debounce(Fn, Delay, DebouncedFn) :-
    asserta(timeout(0)),
    DebouncedFn =.. [call, Fn, Args],
    retract(timeout(_)),
    asserta(timeout(Delay)).

call(Fn, Args) :-
    timeout(0),
    call(Fn, Args),
    retract(timeout(_)),
    asserta(timeout(0)).`,
    top: '60%',
    left: '30%',
    delay: '4s'
  },
  {
    code: `# APL Throttle Function
∇ R←F THROTTLE LIMIT
  R←{⍺←0 ⋄ ⍺≥LIMIT:0 ⋄ F ⍵ ⋄ ⍺+1}0
∇`,
    top: '75%',
    left: '80%',
    delay: '5s'
  },
  {
    code: `; LISP Deep Clone
(defun deep-clone (obj)
  (cond
    ((null obj) nil)
    ((atom obj) obj)
    ((listp obj)
     (cons (deep-clone (car obj))
           (deep-clone (cdr obj))))
    (t (error "Cannot clone ~S" obj))))`,
    top: '85%',
    left: '40%',
    delay: '6s'
  },
  {
    code: `# Haskell Flatten Array
flatten :: [a] -> [a]
flatten [] = []
flatten (x:xs) = x ++ flatten xs`,
    top: '25%',
    left: '50%',
    delay: '7s'
  },
  {
    code: `-* FOCUS Report Language
-TYPE *GENERATE QUARTERLY SALES REPORT
-FILE SALES
-SUM AMOUNT AS 'Total Sales' ACROSS QUARTER BY REGION BY PRODUCT
-ON REGION SUBFOOT
-"Region Total: <TOTAL.AMOUNT"
-END
-ON QUARTER SUBFOOT
-"Quarter Total: <TOTAL.AMOUNT"
-END
-ON REPORT SUBFOOT
-"Grand Total: <GRAND.TOTAL.AMOUNT"
-END

TABLE FILE SALES 
HEADING CENTER
"QUARTERLY SALES REPORT"
" "
SUM DOLLARS/D12.2M WRITE UNDER='TOTAL SALES'
BY REGION NOPRINT BY STATE BY CITY
WHERE DOLLARS GT 5000
ON REGION PAGE-BREAK
ON REGION SUBFOOT
" "
"**** REGION TOTAL $<ST.DOLLARS"
END
ON TABLE SUBFOOT
" "
"**** GRAND TOTAL $<TOT.DOLLARS"
END
END`,
    top: '50%',
    left: '15%',
    delay: '8s'
  },
  {
    code: `*& ABAP Enterprise Report
REPORT ZMATERIAL_USAGE.

DATA: gv_material TYPE matnr,
      gv_plant    TYPE werks_d,
      gs_usage    TYPE zstorage_usage,
      gt_usage    TYPE TABLE OF zstorage_usage.

* Selection screen definition
SELECTION-SCREEN BEGIN OF BLOCK b1 WITH FRAME TITLE text-001.
SELECT-OPTIONS: s_matnr FOR gv_material,
                s_plant FOR gv_plant.
PARAMETERS: p_date TYPE datum DEFAULT sy-datum.
SELECTION-SCREEN END OF BLOCK b1.

* Main processing
START-OF-SELECTION.
  PERFORM get_usage_data.
  PERFORM display_results.

* Get material usage data
FORM get_usage_data.
  SELECT material plant usage_date quantity
    FROM zmaterial_usage
    INTO CORRESPONDING FIELDS OF TABLE gt_usage
    WHERE material IN s_matnr
    AND plant IN s_plant
    AND usage_date <= p_date.

  SORT gt_usage BY material plant usage_date DESCENDING.
ENDFORM.

* Display results
FORM display_results.
  DATA: lv_total TYPE menge_d.

  WRITE: / 'Material Usage Report', 
         / sy-uline.
  WRITE: /3 'Material', 20 'Plant', 35 'Last Usage', 
         55 'Quantity'.
  WRITE: / sy-uline.

  LOOP AT gt_usage INTO gs_usage.
    AT NEW material.
      lv_total = 0.
    ENDAT.

    WRITE: /3 gs_usage-material, 
           20 gs_usage-plant,
           35 gs_usage-usage_date, 
           55 gs_usage-quantity.

    lv_total = lv_total + gs_usage-quantity.

    AT END OF material.
      WRITE: / 'Total:', 55 lv_total.
      ULINE.
    ENDAT.
  ENDLOOP.
ENDFORM.`,
    top: '70%',
    left: '90%',
    delay: '9s'
  },
  {
    code: `# INTERCAL Calendar Program
DO COME FROM (30)
PLEASE DO GIVE UP

(30) PLEASE TAKE NOTE
DO (1000) NEXT
DO FORGET #1
PLEASE DO RESUME #1
DO (1010) NEXT

(1000) DO STASH .1 + .2 + .3 + .4 + .5
DO .1 <- #12
DO .2 <- #31
DO .3 <- #5
DO .4 <- #10
DO .5 <- #1972

(1010) DO WRITE IN .1
PLEASE DO READ OUT .2
DO READ OUT .3
DO FORGET .4
PLEASE DO FORGET .5
PLEASE GIVE UP`,
    top: '10%',
    left: '80%',
    delay: '10s'
  },
  {
    code: `# Algol 68 Graphics Mode
BEGIN
  MODE POINT = STRUCT(REAL x, y);
  MODE VECTOR = STRUCT(REAL dx, dy);
  MODE CIRCLE = STRUCT(POINT center, REAL radius);
  
  OP + = (POINT a, VECTOR b) POINT:
    (a.x + b.dx, a.y + b.dy);
  
  OP INTERSECT = (CIRCLE a, CIRCLE b) BOOL:
    BEGIN
      REAL dist = SQRT((a.center.x - b.center.x) ** 2 + 
                       (a.center.y - b.center.y) ** 2);
      dist <= a.radius + b.radius
    END;
  
  POINT origin := (0.0, 0.0);
  VECTOR displacement := (5.0, 10.0);
  POINT new_point := origin + displacement;
  
  CIRCLE c1 := ((0.0, 0.0), 5.0);
  CIRCLE c2 := ((3.0, 4.0), 6.0);
  
  IF c1 INTERSECT c2 THEN
    print(("Circles intersect"))
  ELSE
    print(("Circles do not intersect"))
  FI
END`,
    top: '35%',
    left: '40%',
    delay: '11s'
  },
  {
    code: `/* REXX System Administration Script */
/* Script to analyze disk space usage */

say "Disk Space Analyzer"
say "===================="

/* Parse command line arguments */
parse arg directory .
if directory = '' then directory = '.'

call check_dir directory
exit

check_dir: procedure
  parse arg dir
  
  /* List files in directory */
  address cmd "dir" dir "/b" with output stem files.
  if files.0 = 0 then return
  
  total_size = 0
  
  do i = 1 to files.0
    full_path = dir || '\' || files.i
    
    /* Get file attributes */
    address cmd "dir" full_path "/a" with output stem file_info.
    parse var file_info.2 date time am_pm size file_name
    
    /* Process file or directory */
    if pos('<DIR>', file_info.2) > 0 then do
      say "Directory:" full_path
      call check_dir full_path
    end
    else do
      size = strip(size)
      total_size = total_size + size
      say right(size, 10) full_path
    end
  end
  
  say "Total size:" total_size "bytes"
  return`,
    top: '65%',
    left: '60%',
    delay: '12s'
  },
  {
    code: `-- OCCAM Parallel Processing
PROC display (CHAN OF BYTE screen, VAL []BYTE message)
  SEQ i = 0 FOR SIZE message
    screen ! message[i]
:

PROC main (CHAN OF BYTE keyboard, screen)
  CHAN OF INT A, B, C:
  PAR
    -- First process
    SEQ
      INT x:
      SEQ
        x := 42
        A ! x
        display (screen, "Process 1 sent data*n")
    
    -- Second process
    INT y:
    SEQ
      A ? y
      y := y * 2
      B ! y
      display (screen, "Process 2 doubled data*n")
    
    -- Third process  
    INT z:
    SEQ
      B ? z
      z := z + 10
      C ! z
      display (screen, "Process 3 added 10*n")
    
    -- Final process
    INT result:
    SEQ
      C ? result
      VAL []BYTE message IS "Result is ":
      SEQ
        display (screen, message)
        INT32TOSTRING (result, 0, screen)
:`,
    top: '20%',
    left: '30%',
    delay: '13s'
  },
  {
    code: `/* PL/I Database Application */
INVENTORY: PROCEDURE OPTIONS(MAIN);
  
  DECLARE INVENTORY_FILE FILE RECORD INPUT ENVIRONMENT(CONSECUTIVE);
  DECLARE REPORT_FILE FILE STREAM OUTPUT PRINT;
  
  DECLARE 1 ITEM_RECORD,
          2 ITEM_ID CHAR(8),
          2 DESCRIPTION CHAR(30),
          2 QUANTITY FIXED DECIMAL(5),
          2 PRICE FIXED DECIMAL(7,2);
          
  DECLARE EOF BIT(1) INIT('0'B);
  DECLARE TOTAL_VALUE FIXED DECIMAL(10,2) INIT(0);
  
  ON ENDFILE(INVENTORY_FILE) EOF = '1'B;
  
  OPEN FILE(INVENTORY_FILE), FILE(REPORT_FILE);
  
  PUT FILE(REPORT_FILE) SKIP EDIT
    ('INVENTORY VALUATION REPORT', 
     '-------------------------')
    (A, SKIP, A);
    
  PUT FILE(REPORT_FILE) SKIP(2) EDIT
    ('ITEM ID', 'DESCRIPTION', 'QTY', 'PRICE', 'VALUE')
    (A(8), X(2), A(30), X(2), A(5), X(2), A(8), X(2), A(10));
  
  READ FILE(INVENTORY_FILE) INTO(ITEM_RECORD);
  
  DO WHILE (^EOF);
    DECLARE ITEM_VALUE FIXED DECIMAL(9,2);
    ITEM_VALUE = QUANTITY * PRICE;
    TOTAL_VALUE = TOTAL_VALUE + ITEM_VALUE;
    
    PUT FILE(REPORT_FILE) SKIP EDIT
      (ITEM_ID, DESCRIPTION, QUANTITY, PRICE, ITEM_VALUE)
      (A(8), X(2), A(30), X(2), F(5), X(2), F(8,2), X(2), F(10,2));
      
    READ FILE(INVENTORY_FILE) INTO(ITEM_RECORD);
  END;
  
  PUT FILE(REPORT_FILE) SKIP(2) EDIT
    ('TOTAL INVENTORY VALUE:', TOTAL_VALUE)
    (A, X(2), F(12,2));
    
  CLOSE FILE(INVENTORY_FILE), FILE(REPORT_FILE);
  
END INVENTORY;`,
    top: '80%',
    left: '20%',
    delay: '14s'
  }
]; 