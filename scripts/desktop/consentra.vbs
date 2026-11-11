' Inicia o Consentra Desktop (app autocontido) sem exibir a janela do console.
' O atalho "Consentra" criado pelo instalador aponta para wscript.exe com este script.
Dim fso, sh, dir
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.Run Chr(34) & dir & "\Consentra.exe" & Chr(34), 0, False
