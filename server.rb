require 'webrick'

port = 8080
server = WEBrick::HTTPServer.new(
  Port: port,
  DocumentRoot: File.expand_path(File.dirname(__FILE__))
)

# Trap signals to shut down gracefully
trap('INT') { server.shutdown }
trap('TERM') { server.shutdown }



puts "=========================================================="
puts "  AP BEAUTY BI Manual local server is starting..."
puts "  Access website via: http://localhost:#{port}"
puts "  Press Ctrl+C to terminate the server."
puts "=========================================================="

server.start
